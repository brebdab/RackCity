from base64 import b64decode
import csv
from django.http import HttpResponse, JsonResponse
from django.core.exceptions import ValidationError
from django.contrib.auth.decorators import permission_required
from django.core.exceptions import ObjectDoesNotExist
from http import HTTPStatus
from io import StringIO, BytesIO
from rackcity.api.serializers import (
    RecursiveAssetSerializer,
    RecursiveAssetCPSerializer,
    ITModelSerializer,
    BulkITModelSerializer,
    normalize_bulk_model_data,
)
from rackcity.models import ITModel, Asset, validate_ports, validate_height
from rackcity.models.asset import get_assets_for_cp, AssetCP
from rackcity.permissions.permissions import PermissionPath
from rackcity.utils.change_planner_utils import get_change_plan
from rackcity.utils.errors_utils import (
    GenericFailure,
    Status,
    parse_serializer_errors,
    parse_save_validation_error,
    BulkFailure,
)
from rackcity.utils.exceptions import (
    LocationException,
    ModelModificationException,
)
from rackcity.utils.log_utils import (
    log_action,
    log_bulk_upload,
    log_bulk_approve,
    log_delete,
    Action,
    ElementType,
)
from rackcity.utils.query_utils import (
    get_sort_arguments,
    get_filter_arguments,
    get_page_count_response,
    get_many_response,
    get_filtered_query,
)
from rackcity.utils.rackcity_utils import (
    validate_asset_location_in_rack,
    records_are_identical,
)
import re
from rest_framework.decorators import permission_classes, api_view
from rest_framework.parsers import JSONParser
from rest_framework.permissions import IsAuthenticated


@api_view(["POST"])
@permission_required(PermissionPath.MODEL_WRITE.value, raise_exception=True)
def model_add(request):
    """
    Add a new model
    """
    data = JSONParser().parse(request)
    if "id" in data:
        return JsonResponse(
            {
                "failure_message": Status.CREATE_ERROR.value
                + GenericFailure.INTERNAL.value,
                "errors": "Don't include 'id' when creating a model",
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    serializer = ITModelSerializer(data=data)
    if not serializer.is_valid(raise_exception=False):
        return JsonResponse(
            {
                "failure_message": Status.INVALID_INPUT.value
                + parse_serializer_errors(serializer.errors),
                "errors": str(serializer.errors),
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    try:
        new_model = serializer.save()
    except Exception as error:
        return JsonResponse(
            {
                "failure_message": Status.CREATE_ERROR.value
                + parse_save_validation_error(error, "Model"),
                "errors": str(error),
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    log_action(request.user, new_model, Action.CREATE)
    return JsonResponse(
        {
            "success_message": Status.SUCCESS.value
            + new_model.vendor
            + " "
            + new_model.model_number
            + " created"
        },
        status=HTTPStatus.CREATED,
    )


@api_view(["POST"])
@permission_required(PermissionPath.MODEL_WRITE.value, raise_exception=True)
def model_modify(request):
    """
    Modify an existing model
    """
    data = JSONParser().parse(request)
    if "id" not in data:
        return JsonResponse(
            {
                "failure_message": Status.MODIFY_ERROR.value
                + GenericFailure.INTERNAL.value,
                "errors": "Must include 'id' when modifying a model",
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    id = data["id"]
    try:
        existing_model = ITModel.objects.get(id=id)
    except ObjectDoesNotExist:
        return JsonResponse(
            {
                "failure_message": Status.MODIFY_ERROR.value
                + "Model"
                + GenericFailure.DOES_NOT_EXIST.value,
                "errors": "No existing model with id=" + str(id),
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    try:
        validate_model_height_change(data, existing_model)
    except LocationException as error:
        location_failure = "Height change of model causes conflicts. " + str(error)
        return JsonResponse(
            {"failure_message": Status.MODIFY_ERROR.value + location_failure},
            status=HTTPStatus.BAD_REQUEST,
        )
    try:
        validate_model_change(data, existing_model)
    except ModelModificationException as error:
        modification_failure = str(error) + " There are existing assets with this model"
        return JsonResponse(
            {"failure_message": Status.MODIFY_ERROR.value + modification_failure},
            status=HTTPStatus.BAD_REQUEST,
        )
    for field in data.keys():
        setattr(existing_model, field, data[field])
    try:
        existing_model.save()
    except Exception as error:
        return JsonResponse(
            {
                "failure_message": Status.MODIFY_ERROR.value
                + parse_save_validation_error(error, "Model"),
                "errors": str(error),
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    log_action(request.user, existing_model, Action.MODIFY)
    return JsonResponse(
        {
            "success_message": Status.SUCCESS.value
            + existing_model.vendor
            + " "
            + existing_model.model_number
            + " modified"
        },
        status=HTTPStatus.OK,
    )


def validate_model_change(new_model_data, existing_model):
    if (
        "model_type" in new_model_data
        and new_model_data["model_type"] != existing_model.model_type
    ):
        raise ModelModificationException("Unable to modify model type. ")
    if (
        "network_ports" not in new_model_data
        and "num_power_ports" not in new_model_data
    ):
        return
    assets = Asset.objects.filter(model=existing_model.id)
    if len(assets) > 0:
        if new_model_data["network_ports"] or existing_model.network_ports:
            if (
                (not new_model_data["network_ports"] and existing_model.network_ports)
                or (
                    new_model_data["network_ports"] and not existing_model.network_ports
                )
                or (
                    set(new_model_data["network_ports"])
                    != set(existing_model.network_ports)
                )
            ):
                raise ModelModificationException("Unable to modify network ports. ")
        if new_model_data["num_power_ports"] or existing_model.num_power_ports:
            if (
                not new_model_data["num_power_ports"] and existing_model.num_power_ports
            ) or (
                int(new_model_data["num_power_ports"]) != existing_model.num_power_ports
            ):
                raise ModelModificationException(
                    "Unable to modify number of power ports. "
                )
    return


def validate_model_height_change(new_model_data, existing_model):
    if "height" not in new_model_data or not new_model_data["height"]:
        return
    new_model_height = int(new_model_data["height"])
    if new_model_height <= existing_model.height:
        return
    else:
        assets = Asset.objects.filter(model=existing_model.id)
        for asset in assets:
            try:
                validate_asset_location_in_rack(
                    asset.rack.id, asset.rack_position, new_model_height, asset.id
                )
            except LocationException as error:
                raise error
        return


@api_view(["POST"])
@permission_required(PermissionPath.MODEL_WRITE.value, raise_exception=True)
def model_delete(request):
    """
    Delete an existing model
    """
    data = JSONParser().parse(request)
    if "id" not in data:
        return JsonResponse(
            {
                "failure_message": Status.DELETE_ERROR.value
                + GenericFailure.INTERNAL.value,
                "errors": "Must include 'id' when deleting a model",
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    id = data["id"]
    try:
        existing_model = ITModel.objects.get(id=id)
    except ObjectDoesNotExist:
        return JsonResponse(
            {
                "failure_message": Status.DELETE_ERROR.value
                + "Model"
                + GenericFailure.DOES_NOT_EXIST.value,
                "errors": "No existing model with id=" + str(id),
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    assets = Asset.objects.filter(model=id)
    if assets:
        return JsonResponse(
            {
                "failure_message": Status.DELETE_ERROR.value
                + "Cannot delete this model because assets of it exist"
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    assets_cp = AssetCP.objects.filter(model=id)
    if assets_cp:
        return JsonResponse(
            {
                "failure_message": Status.DELETE_ERROR.value
                + "Cannot delete this model because assets of it exist on change plan(s)"
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    try:
        model_name = " ".join([existing_model.vendor, existing_model.model_number])
        existing_model.delete()
    except Exception as error:
        return JsonResponse(
            {
                "failure_message": Status.DELETE_ERROR.value
                + "Model"
                + GenericFailure.ON_DELETE.value,
                "errors": str(error),
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    log_delete(request.user, ElementType.MODEL, model_name)
    return JsonResponse(
        {"success_message": Status.SUCCESS.value + model_name + " deleted"},
        status=HTTPStatus.OK,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def model_many(request):
    """
    List many models. If page is not specified as a query parameter, all
    models are returned. If page is specified as a query parameter, page
    size must also be specified, and a page of models will be returned.
    """
    return get_many_response(ITModel, ITModelSerializer, "models", request,)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def model_detail(request, id):
    """
    Retrieve a single model.
    """
    try:
        model = ITModel.objects.get(id=id)
        model_serializer = ITModelSerializer(model)
        (change_plan, failure_response) = get_change_plan(
            request.query_params.get("change_plan")
        )
        if failure_response:
            return failure_response
        if change_plan:
            assets, assets_cp = get_assets_for_cp(change_plan.id)
            assets = assets.filter(model=id)
            assets_cp = assets_cp.filter(model=id, change_plan=change_plan.id)
            assets_cp_serializer = RecursiveAssetCPSerializer(assets_cp, many=True)
        else:
            assets = Asset.objects.filter(model=id)
        assets_serializer = RecursiveAssetSerializer(assets, many=True)
        if change_plan:
            asset_data = assets_serializer.data + assets_cp_serializer.data
        else:
            asset_data = assets_serializer.data
        model_detail = {"model": model_serializer.data, "assets": asset_data}
        return JsonResponse(model_detail, status=HTTPStatus.OK)
    except ObjectDoesNotExist:
        return JsonResponse(
            {
                "failure_message": Status.ERROR.value
                + "Model"
                + GenericFailure.DOES_NOT_EXIST.value,
                "errors": "No existing model with id=" + str(id),
            },
            status=HTTPStatus.BAD_REQUEST,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def model_vendors(request):
    """
    Get all known vendors.
    """
    vendors_names = [
        name
        for name in ITModel.objects.values_list("vendor", flat=True).distinct("vendor")
    ]
    return JsonResponse({"vendors": vendors_names}, status=HTTPStatus.OK,)


@api_view(["POST"])
@permission_required(PermissionPath.MODEL_WRITE.value, raise_exception=True)
def model_bulk_upload(request):
    """
    Bulk upload many models to add or modify
    """
    data = JSONParser().parse(request)
    if "import_csv" not in data:
        return JsonResponse(
            {
                "failure_message": Status.IMPORT_ERROR.value + BulkFailure.IMPORT.value,
                "errors": "Bulk upload request should have a parameter 'file'",
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    base_64_csv = data["import_csv"]
    csv_bytes_io = BytesIO(b64decode(re.sub(".*base64,", "", base_64_csv)))
    csv_string_io = StringIO(csv_bytes_io.read().decode("UTF-8-SIG"))
    csv_reader = csv.DictReader(csv_string_io)
    expected_fields = BulkITModelSerializer.Meta.fields
    given_fields = csv_reader.fieldnames
    if len(expected_fields) != len(given_fields) or set(  # check for repeated fields
        expected_fields
    ) != set(given_fields):
        return JsonResponse(
            {
                "failure_message": Status.IMPORT_ERROR.value
                + BulkFailure.IMPORT_COLUMNS.value
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    bulk_model_datas = []
    for row in csv_reader:
        bulk_model_datas.append(dict(row))
    models_to_add = []
    potential_modifications = []
    models_in_import = set()
    for bulk_model_data in bulk_model_datas:
        model_data = normalize_bulk_model_data(bulk_model_data)
        model_serializer = ITModelSerializer(data=model_data)
        if not model_serializer.is_valid():
            return JsonResponse(
                {
                    "failure_message": Status.IMPORT_ERROR.value
                    + BulkFailure.MODEL_INVALID.value
                    + parse_serializer_errors(model_serializer.errors),
                    "errors": str(model_serializer.errors),
                },
                status=HTTPStatus.BAD_REQUEST,
            )
        try:
            validate_ports(
                model_serializer.validated_data["model_type"],
                model_serializer.validated_data["num_power_ports"],
                model_serializer.validated_data["network_ports"],
            )
        except ValidationError as error:
            return JsonResponse(
                {
                    "failure_message": Status.IMPORT_ERROR.value
                    + BulkFailure.MODEL_INVALID.value
                    + str(error.message)
                },
                status=HTTPStatus.BAD_REQUEST,
            )
        try:
            validate_height(
                model_serializer.validated_data["model_type"],
                model_serializer.validated_data["height"],
            )
        except ValidationError as error:
            return JsonResponse(
                {
                    "failure_message": Status.IMPORT_ERROR.value
                    + BulkFailure.MODEL_INVALID.value
                    + str(error.message)
                },
                status=HTTPStatus.BAD_REQUEST,
            )
        if (model_data["vendor"], model_data["model_number"]) in models_in_import:
            failure_message = (
                Status.IMPORT_ERROR.value
                + "Vendor+model_number combination must be unique, but "
                + "vendor="
                + model_data["vendor"]
                + ", model_number="
                + model_data["model_number"]
                + " appears more than once in import. "
            )
            return JsonResponse(
                {"failure_message": failure_message}, status=HTTPStatus.BAD_REQUEST
            )
        else:
            models_in_import.add((model_data["vendor"], model_data["model_number"]))
        try:
            existing_model = ITModel.objects.get(
                vendor=model_data["vendor"], model_number=model_data["model_number"]
            )
        except ObjectDoesNotExist:
            models_to_add.append(model_serializer)
        else:
            try:
                validate_model_height_change(model_data, existing_model)
            except LocationException as error:
                failure_message = (
                    Status.IMPORT_ERROR.value
                    + "Height change of this model causes conflicts: "
                    + "vendor="
                    + model_data["vendor"]
                    + ", model_number="
                    + model_data["model_number"]
                    + ". "
                    + str(error)
                )
                return JsonResponse(
                    {"failure_message": failure_message},
                    status=HTTPStatus.NOT_ACCEPTABLE,
                )
            try:
                validate_model_change(model_data, existing_model)
            except ModelModificationException as error:
                modification_failure = (
                    " There are existing assets with this model: "
                    + "vendor="
                    + model_data["vendor"]
                    + ", model_number="
                    + model_data["model_number"]
                    + ". "
                    + str(error)
                )
                return JsonResponse(
                    {
                        "failure_message": Status.IMPORT_ERROR.value
                        + modification_failure
                    },
                    status=HTTPStatus.BAD_REQUEST,
                )

            potential_modifications.append(
                {
                    "existing_model": existing_model,
                    "new_data": model_serializer.validated_data,
                }
            )
    records_added = 0
    for model_to_add in models_to_add:
        records_added += 1
        model_to_add.save()
    records_ignored = 0
    modifications_to_approve = []
    for potential_modification in potential_modifications:
        new_data = potential_modification["new_data"]
        existing_data = ITModelSerializer(potential_modification["existing_model"]).data
        if records_are_identical(existing_data, new_data):
            records_ignored += 1
        else:
            new_data["id"] = potential_modification["existing_model"].id
            for field in existing_data.keys():
                if field not in new_data:
                    new_data[field] = None
            modifications_to_approve.append(
                {"existing": existing_data, "modified": new_data}
            )
    log_bulk_upload(
        request.user,
        ElementType.MODEL,
        records_added,
        records_ignored,
        len(modifications_to_approve),
    )
    return JsonResponse(
        {
            "added": records_added,
            "ignored": records_ignored,
            "modifications": modifications_to_approve,
        },
        status=HTTPStatus.OK,
    )


@api_view(["POST"])
@permission_required(PermissionPath.MODEL_WRITE.value, raise_exception=True)
def model_bulk_approve(request):
    """
    Bulk approve many models to modify
    """
    data = JSONParser().parse(request)
    if "approved_modifications" not in data:
        return JsonResponse(
            {
                "failure_message": Status.IMPORT_ERROR.value + BulkFailure.IMPORT.value,
                "errors": "Bulk approve request should have a parameter "
                + "'approved_modifications'",
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    model_datas = data["approved_modifications"]
    for model_data in model_datas:
        model_serializer = ITModelSerializer(data=model_data)
        if not model_serializer.is_valid():
            failure_message = "At least one modification was not valid. " + str(
                model_serializer.errors
            )
            return JsonResponse(
                {"failure_message": failure_message}, status=HTTPStatus.BAD_REQUEST
            )
    for model_data in model_datas:
        existing_model = ITModel.objects.get(id=model_data["id"])
        for field in model_data.keys():
            # This is assumed to have all fields, and with null values for blank ones,
            # that's how it's returned in bulk-upload
            setattr(existing_model, field, model_data[field])
        existing_model.save()
    log_bulk_approve(request.user, ElementType.MODEL, len(model_datas))
    return HttpResponse(status=HTTPStatus.OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def model_bulk_export(request):
    """
    List all models in csv form, in accordance with Bulk Spec.
    """
    models_query = ITModel.objects
    filtered_query, failure_response = get_filtered_query(models_query, request.data)
    if failure_response:
        return failure_response
    try:
        sort_args = get_sort_arguments(request.data)
    except Exception as error:
        return JsonResponse(
            {
                "failure_message": Status.EXPORT_ERROR.value
                + GenericFailure.SORT.value,
                "errors": str(error),
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    models = filtered_query.order_by(*sort_args)

    serializer = BulkITModelSerializer(models, many=True)
    csv_string = StringIO()
    fields = serializer.data[0].keys()
    csv_writer = csv.DictWriter(csv_string, fields)
    csv_writer.writeheader()
    csv_writer.writerows(serializer.data)
    return JsonResponse({"export_csv": csv_string.getvalue()}, status=HTTPStatus.OK,)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def model_page_count(request):
    """
    Return total number of pages according to page size, which must be
    specified as query parameter.
    """
    return get_page_count_response(
        ITModel, request.query_params, data_for_filters=request.data,
    )


@api_view(["GET"])
def model_fields(request):
    """
    Return all fields on the ITModelSerializer.
    """
    return JsonResponse(
        {
            "fields": [
                "vendor",
                "model_number",
                "height",
                "display_color",
                "num_network_ports",
                "network_ports",
                "num_power_ports",
                "cpu",
                "memory_gb",
                "storage",
                "comment",
            ]
        },
        status=HTTPStatus.OK,
    )
