from base64 import b64decode
import csv
from django.core.exceptions import ObjectDoesNotExist
from django.http import JsonResponse
from http import HTTPStatus
from io import StringIO, BytesIO
from rackcity.api.serializers import (
    AssetSerializer,
    AssetCPSerializer,
    GetDecommissionedAssetSerializer,
    RecursiveAssetSerializer,
    RecursiveAssetCPSerializer,
    BulkAssetSerializer,
    ITModelSerializer,
    RackSerializer,
    normalize_bulk_asset_data,
)
from rackcity.models import (
    Asset,
    DecommissionedAsset,
    ITModel,
    Rack,
    Site,
)
from rackcity.models.asset import (
    get_assets_for_cp,
    get_next_available_asset_number,
    AssetCP,
)
from rackcity.utils.asset_utils import (
    does_asset_exist,
    save_all_connection_data,
    save_power_connections,
    save_all_field_data_live,
    save_all_field_data_cp,
)
from rackcity.utils.change_planner_utils import (
    get_change_plan,
    get_many_assets_response_for_cp,
    get_page_count_response_for_cp,
    get_cp_already_executed_response,
)
from rackcity.utils.errors_utils import (
    Status,
    GenericFailure,
    parse_serializer_errors,
    parse_save_validation_error,
    BulkFailure,
    AuthFailure,
)
from rackcity.utils.exceptions import (
    LocationException,
    PowerConnectionException,
    UserAssetPermissionException,
    AssetModificationException,
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
)
from rackcity.utils.rackcity_utils import (
    validate_asset_location_in_rack,
    validate_asset_location_in_chassis,
    validate_location_modification,
    no_infile_location_conflicts,
    records_are_identical,
    validate_hostname_deletion,
)
from rackcity.permissions.permissions import (
    user_has_asset_permission,
    validate_user_permission_on_existing_asset,
    validate_user_permission_on_new_asset_data,
)
import re
from rest_framework.decorators import permission_classes, api_view
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import JSONParser
from PIL import Image
import numpy
from pyzbar.pyzbar import decode


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def asset_many(request):
    """
    List many assets in datacenters. If page is not specified as a query parameter, all
    assets are returned. If page is specified as a query parameter, page
    size must also be specified, and a page of assets will be returned.
    """
    (change_plan, failure_response) = get_change_plan(
        request.query_params.get("change_plan")
    )
    if failure_response:
        return failure_response
    if change_plan:
        return get_many_assets_response_for_cp(request, change_plan, stored=False)
    else:
        racked_assets = Asset.objects.filter(offline_storage_site__isnull=True)
        return get_many_response(
            Asset,
            RecursiveAssetSerializer,
            "assets",
            request,
            premade_object_query=racked_assets,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def offline_storage_asset_many(request):
    """
    List many assets in offline storage. If page is not specified as a query parameter, all
    assets are returned. If page is specified as a query parameter, page
    size must also be specified, and a page of assets will be returned.
    """
    (change_plan, failure_response) = get_change_plan(
        request.query_params.get("change_plan")
    )
    if failure_response:
        return failure_response
    if change_plan:
        return get_many_assets_response_for_cp(request, change_plan, stored=True)
    else:
        stored_assets = Asset.objects.filter(offline_storage_site__isnull=False)
        return get_many_response(
            Asset,
            RecursiveAssetSerializer,
            "assets",
            request,
            premade_object_query=stored_assets,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def asset_detail(request, id):
    """
    Retrieve a single asset.
    """
    (change_plan, failure_response) = get_change_plan(
        request.query_params.get("change_plan")
    )
    if failure_response:
        return failure_response
    try:
        if change_plan:
            assets, assets_cp = get_assets_for_cp(
                change_plan.id, show_decommissioned=True
            )
            # if id of live asset is given on a change plan, just return the corresponding related assetCP
            if assets_cp.filter(related_asset=id).exists():
                asset = assets_cp.get(related_asset=id)
                serializer = RecursiveAssetCPSerializer(asset)
            elif assets_cp.filter(id=id).exists():
                asset = assets_cp.get(id=id)
                serializer = RecursiveAssetCPSerializer(asset)
            else:
                asset = assets.get(id=id)
                serializer = RecursiveAssetSerializer(asset)
        else:
            asset = Asset.objects.get(id=id)
            serializer = RecursiveAssetSerializer(asset)
    except Asset.DoesNotExist:
        try:
            decommissioned_asset = DecommissionedAsset.objects.get(live_id=id)
        except DecommissionedAsset.DoesNotExist:
            return JsonResponse(
                {
                    "failure_message": Status.ERROR.value
                    + "Asset"
                    + GenericFailure.DOES_NOT_EXIST.value,
                    "errors": "No existing asset with id=" + str(id),
                },
                status=HTTPStatus.BAD_REQUEST,
            )
        else:
            serializer = GetDecommissionedAssetSerializer(decommissioned_asset)

    return JsonResponse(serializer.data, status=HTTPStatus.OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def asset_add(request):
    """
    Add a new asset.
    """
    data = JSONParser().parse(request)
    if "id" in data:
        return JsonResponse(
            {
                "failure_message": Status.CREATE_ERROR.value
                + GenericFailure.INTERNAL.value,
                "errors": "Don't include 'id' when creating an asset",
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    (change_plan, failure_response) = get_change_plan(
        request.query_params.get("change_plan")
    )
    if failure_response:
        return failure_response
    if change_plan:
        failure_response = get_cp_already_executed_response(change_plan)
        if failure_response:
            return failure_response
        data["change_plan"] = change_plan.id
        serializer = AssetCPSerializer(data=data)
    else:
        serializer = AssetSerializer(data=data)
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
        validate_user_permission_on_new_asset_data(
            request.user, serializer.validated_data, data_is_validated=True
        )
    except UserAssetPermissionException as auth_error:
        return JsonResponse(
            {"failure_message": Status.AUTH_ERROR.value + str(auth_error)},
            status=HTTPStatus.UNAUTHORIZED,
        )
    except Exception as error:
        return JsonResponse(
            {"failure_message": Status.CREATE_ERROR.value + str(error)},
            status=HTTPStatus.BAD_REQUEST,
        )
    if not (
        "offline_storage_site" in serializer.validated_data
        and serializer.validated_data["offline_storage_site"]
    ):
        if serializer.validated_data["model"].is_rackmount():
            if (
                "rack" not in serializer.validated_data
                or not serializer.validated_data["rack"]
                or "rack_position" not in serializer.validated_data
                or not serializer.validated_data["rack_position"]
            ):
                return JsonResponse(
                    {
                        "failure_message": Status.INVALID_INPUT.value
                        + "Must include rack and rack position to add a rackmount asset. "
                    },
                    status=HTTPStatus.BAD_REQUEST,
                )
            rack_id = serializer.validated_data["rack"].id
            rack_position = serializer.validated_data["rack_position"]
            height = serializer.validated_data["model"].height
            try:
                validate_asset_location_in_rack(
                    rack_id, rack_position, height, change_plan=change_plan
                )
            except LocationException as error:
                return JsonResponse(
                    {"failure_message": Status.CREATE_ERROR.value + str(error)},
                    status=HTTPStatus.BAD_REQUEST,
                )
        else:
            if (
                "chassis" not in serializer.validated_data
                or not serializer.validated_data["chassis"]
                or "chassis_slot" not in serializer.validated_data
                or not serializer.validated_data["chassis_slot"]
            ):
                return JsonResponse(
                    {
                        "failure_message": Status.INVALID_INPUT.value
                        + "Must include chassis and chassis slot to add a blade asset. "
                    },
                    status=HTTPStatus.BAD_REQUEST,
                )
            chassis_id = serializer.validated_data["chassis"].id
            chassis_slot = serializer.validated_data["chassis_slot"]
            try:
                validate_asset_location_in_chassis(
                    chassis_id, chassis_slot, change_plan=change_plan
                )
            except LocationException as error:
                return JsonResponse(
                    {"failure_message": Status.CREATE_ERROR.value + str(error)},
                    status=HTTPStatus.BAD_REQUEST,
                )
    try:
        asset = serializer.save()
    except Exception as error:
        return JsonResponse(
            {
                "failure_message": Status.CREATE_ERROR.value
                + parse_save_validation_error(error, "Asset"),
                "errors": str(error),
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    warning_message = save_all_connection_data(
        data, asset, request.user, change_plan=change_plan
    )
    if warning_message:
        return JsonResponse({"warning_message": warning_message}, status=HTTPStatus.OK)
    if change_plan:
        return JsonResponse(
            {
                "success_message": Status.SUCCESS.value
                + "Asset created on change plan "
                + change_plan.name,
                "related_id": change_plan.id,
            },
            status=HTTPStatus.OK,
        )
    else:
        log_action(request.user, asset, Action.CREATE)
        return JsonResponse(
            {
                "success_message": Status.SUCCESS.value
                + "Asset "
                + str(asset.asset_number)
                + " created"
            },
            status=HTTPStatus.OK,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def asset_modify(request):
    """
    Modify a single existing asset
    """
    data = JSONParser().parse(request)
    if "id" not in data:
        return JsonResponse(
            {
                "failure_message": Status.MODIFY_ERROR.value
                + GenericFailure.INTERNAL.value,
                "errors": "Must include 'id' when modifying an asset",
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    asset_id = data["id"]

    (change_plan, failure_response) = get_change_plan(
        request.query_params.get("change_plan")
    )
    if failure_response:
        return failure_response
    create_new_asset_cp = False
    existing_asset = None
    if change_plan:
        failure_response = get_cp_already_executed_response(change_plan)
        if failure_response:
            return failure_response

        create_new_asset_cp = not AssetCP.objects.filter(
            id=asset_id, change_plan=change_plan.id
        ).exists()

        if not create_new_asset_cp:
            existing_asset = AssetCP.objects.get(
                id=asset_id, change_plan=change_plan.id
            )
        if not does_asset_exist(asset_id, change_plan):
            return JsonResponse(
                {
                    "failure_message": Status.MODIFY_ERROR.value
                    + "Asset"
                    + GenericFailure.DOES_NOT_EXIST.value,
                    "errors": "No existing asset with id=" + str(asset_id),
                },
                status=HTTPStatus.BAD_REQUEST,
            )
    if create_new_asset_cp or not change_plan:
        try:
            existing_asset = Asset.objects.get(id=asset_id)
        except ObjectDoesNotExist:
            return JsonResponse(
                {
                    "failure_message": Status.MODIFY_ERROR.value
                    + "Model"
                    + GenericFailure.DOES_NOT_EXIST.value,
                    "errors": "No existing asset with id=" + str(asset_id),
                },
                status=HTTPStatus.BAD_REQUEST,
            )
    try:
        validate_user_permission_on_existing_asset(request.user, existing_asset)
    except UserAssetPermissionException as auth_error:
        return JsonResponse(
            {"failure_message": Status.AUTH_ERROR.value + str(auth_error)},
            status=HTTPStatus.UNAUTHORIZED,
        )

    try:
        validate_user_permission_on_new_asset_data(
            request.user, data, data_is_validated=False
        )
    except UserAssetPermissionException as auth_error:
        return JsonResponse(
            {"failure_message": Status.AUTH_ERROR.value + str(auth_error)},
            status=HTTPStatus.UNAUTHORIZED,
        )
    try:
        validate_hostname_deletion(data, existing_asset)
    except AssetModificationException as modifcation_exception:
        return JsonResponse(
            {
                "failure_message": Status.MODIFY_ERROR.value
                + "Invalid hostname deletion. "
                + str(modifcation_exception)
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    try:
        validate_location_modification(data, existing_asset, change_plan=change_plan)
    except Exception as error:
        return JsonResponse(
            {
                "failure_message": Status.MODIFY_ERROR.value
                + "Invalid location change. "
                + str(error)
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    asset_cp = None
    if change_plan:
        (asset_cp, failure_message) = save_all_field_data_cp(
            data, existing_asset, change_plan, create_new_asset_cp
        )
    else:
        failure_message = save_all_field_data_live(data, existing_asset)
    if failure_message:
        return JsonResponse(
            {"failure_message": Status.MODIFY_ERROR.value + failure_message},
            status=HTTPStatus.BAD_REQUEST,
        )

    if asset_cp:
        existing_asset = asset_cp

    warning_message = save_all_connection_data(
        data, existing_asset, request.user, change_plan=change_plan
    )
    if warning_message:
        return JsonResponse({"warning_message": warning_message}, status=HTTPStatus.OK)

    if change_plan:
        return JsonResponse(
            {
                "success_message": Status.SUCCESS.value
                + "Asset modified on change plan "
                + change_plan.name,
                "related_id": change_plan.id,
            },
            status=HTTPStatus.OK,
        )
    else:
        log_action(request.user, existing_asset, Action.MODIFY)
        return JsonResponse(
            {
                "success_message": Status.SUCCESS.value
                + "Asset "
                + str(existing_asset.asset_number)
                + " modified"
            },
            status=HTTPStatus.OK,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def asset_delete(request):
    """
    Delete a single existing asset
    """
    data = JSONParser().parse(request)
    if "id" not in data:
        return JsonResponse(
            {
                "failure_message": Status.DELETE_ERROR.value
                + GenericFailure.INTERNAL.value,
                "errors": "Must include 'id' when deleting an asset",
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    asset_id = data["id"]
    try:
        existing_asset = Asset.objects.get(id=asset_id)
    except ObjectDoesNotExist:
        return JsonResponse(
            {
                "failure_message": Status.DELETE_ERROR.value
                + "Model"
                + GenericFailure.DOES_NOT_EXIST.value,
                "errors": "No existing asset with id=" + str(asset_id),
            },
            status=HTTPStatus.BAD_REQUEST,
        )

    try:
        validate_user_permission_on_existing_asset(request.user, existing_asset)
    except UserAssetPermissionException as auth_error:
        return JsonResponse(
            {"failure_message": Status.AUTH_ERROR.value + str(auth_error)},
            status=HTTPStatus.UNAUTHORIZED,
        )
    if existing_asset.model.is_blade_chassis():
        blades = Asset.objects.filter(chassis=existing_asset)
        if len(blades) > 0:
            return JsonResponse(
                {
                    "failure_message": Status.DELETE_ERROR.value
                    + "Cannot delete a chassis with blades in it. "
                },
                status=HTTPStatus.BAD_REQUEST,
            )
    try:
        existing_asset.delete()
    except Exception as error:
        return JsonResponse(
            {
                "failure_message": Status.DELETE_ERROR.value
                + "Asset"
                + GenericFailure.ON_DELETE.value,
                "errors": str(error),
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    if existing_asset.hostname:
        asset_log_name = (
            str(existing_asset.asset_number) + " (" + existing_asset.hostname + ")"
        )
    else:
        asset_log_name = str(existing_asset.asset_number)
    log_delete(request.user, ElementType.ASSET, asset_log_name)
    return JsonResponse(
        {
            "success_message": Status.SUCCESS.value
            + "Asset "
            + str(asset_number)
            + " deleted"
        },
        status=HTTPStatus.OK,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def asset_bulk_upload(request):
    """
    Bulk upload many assets to add or modify
    """
    data = JSONParser().parse(request)
    if "import_csv" not in data:
        return JsonResponse(
            {
                "failure_message": Status.IMPORT_ERROR.value + BulkFailure.IMPORT.value,
                "errors": "Bulk upload request should have a parameter 'import_csv'",
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    base_64_csv = data["import_csv"]
    csv_bytes_io = BytesIO(b64decode(re.sub(".*base64,", "", base_64_csv)))
    csv_string_io = StringIO(csv_bytes_io.read().decode("UTF-8-SIG"))
    csv_reader = csv.DictReader(csv_string_io)
    expected_fields = BulkAssetSerializer.Meta.fields
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
    bulk_asset_datas = []
    for row in csv_reader:
        bulk_asset_datas.append(dict(row))
    assets_to_add = []
    potential_modifications = []
    hostnames_in_import = set()
    asset_numbers_in_import = set()
    asset_datas = []
    warning_message = ""
    for bulk_asset_data in bulk_asset_datas:
        asset_data = normalize_bulk_asset_data(bulk_asset_data)
        asset_datas.append(asset_data)
        try:
            model = ITModel.objects.get(
                vendor=asset_data["vendor"], model_number=asset_data["model_number"]
            )
        except ObjectDoesNotExist:
            failure_message = (
                Status.IMPORT_ERROR.value
                + "Model does not exist: "
                + "vendor="
                + asset_data["vendor"]
                + ", model_number="
                + asset_data["model_number"]
            )
            return JsonResponse(
                {"failure_message": failure_message}, status=HTTPStatus.BAD_REQUEST
            )
        asset_data["model"] = model.id
        del asset_data["vendor"]
        del asset_data["model_number"]
        try:
            datacenter = Site.objects.get(abbreviation=asset_data["datacenter"])
        except ObjectDoesNotExist:
            failure_message = (
                Status.IMPORT_ERROR.value
                + "Provided datacenter doesn't exist: "
                + asset_data["datacenter"]
            )
            return JsonResponse(
                {"failure_message": failure_message}, status=HTTPStatus.BAD_REQUEST
            )
        try:
            row_letter = asset_data["rack"][:1].upper()
            rack_num = asset_data["rack"][1:]
            rack = Rack.objects.get(
                datacenter=datacenter, row_letter=row_letter, rack_num=rack_num
            )
        except ObjectDoesNotExist:
            failure_message = (
                Status.IMPORT_ERROR.value
                + "Provided rack doesn't exist: "
                + asset_data["rack"]
            )
            return JsonResponse(
                {"failure_message": failure_message}, status=HTTPStatus.BAD_REQUEST
            )
        asset_data["rack"] = rack.id
        asset_serializer = AssetSerializer(data=asset_data)  # non-recursive to validate
        if not asset_serializer.is_valid():
            errors = asset_serializer.errors
            if not (
                # if the only errors are the asset number and/or
                # hostname uniqueness, that's fine - it's a modify
                (
                    len(errors.keys()) == 2  # known bug here!
                    and "hostname" in errors
                    and len(errors["hostname"]) == 1
                    and errors["hostname"][0].code == "unique"
                    and "asset_number" in errors
                    and len(errors["asset_number"]) == 1
                    and errors["asset_number"][0].code == "unique"
                )
                or (
                    len(errors.keys()) == 1
                    and "asset_number" in errors
                    and len(errors["asset_number"]) == 1
                    and errors["asset_number"][0].code == "unique"
                )
            ):
                return JsonResponse(
                    {
                        "failure_message": Status.IMPORT_ERROR.value
                        + BulkFailure.ASSET_INVALID.value
                        + parse_serializer_errors(asset_serializer.errors),
                        "errors": str(asset_serializer.errors),
                    },
                    status=HTTPStatus.BAD_REQUEST,
                )
        # Check that all hostnames in file are case insensitive unique
        if "hostname" in asset_data and asset_data["hostname"]:
            asset_data_hostname_lower = asset_data["hostname"].lower()
            if asset_data_hostname_lower in hostnames_in_import:
                failure_message = (
                    Status.IMPORT_ERROR.value
                    + "Hostname must be unique, but '"
                    + asset_data_hostname_lower
                    + "' appears more than once in import. "
                )
                return JsonResponse(
                    {"failure_message": failure_message}, status=HTTPStatus.BAD_REQUEST
                )
            else:
                hostnames_in_import.add(asset_data_hostname_lower)
        # Check that all asset_numbers in file are unique
        if "asset_number" in asset_data and asset_data["asset_number"]:
            asset_number = asset_data["asset_number"]
            if asset_number in asset_numbers_in_import:
                failure_message = (
                    Status.IMPORT_ERROR.value
                    + "Asset number must be unique, but '"
                    + str(asset_number)
                    + "' appears more than once in import. "
                )
                return JsonResponse(
                    {"failure_message": failure_message}, status=HTTPStatus.BAD_REQUEST
                )
            else:
                asset_numbers_in_import.add(asset_number)
        asset_exists = False
        if "asset_number" in asset_data and asset_data["asset_number"]:
            try:
                existing_asset = Asset.objects.get(
                    asset_number=asset_data["asset_number"]
                )
            except ObjectDoesNotExist:
                pass
            else:
                asset_exists = True
        if asset_exists:
            # asset number specfies existing asset
            try:
                validate_user_permission_on_new_asset_data(
                    request.user, asset_data, data_is_validated=False
                )
            except UserAssetPermissionException as auth_error:
                return JsonResponse(
                    {"failure_message": Status.IMPORT_ERROR.value + str(auth_error)},
                    status=HTTPStatus.BAD_REQUEST,
                )
            try:
                validate_location_modification(asset_data, existing_asset)
            except Exception as error:
                failure_message = (
                    Status.IMPORT_ERROR.value
                    + "Asset "
                    + str(asset_data["asset_number"])
                    + " would conflict location with an existing asset. "
                )
                return JsonResponse(
                    {"failure_message": failure_message, "errors": str(error)},
                    status=HTTPStatus.BAD_REQUEST,
                )
            potential_modifications.append(
                {"existing_asset": existing_asset, "new_data": asset_data}
            )
        else:
            # asset number not provided or it is new
            rack = asset_serializer.validated_data["rack"]
            if not user_has_asset_permission(request.user, rack.datacenter):
                return JsonResponse(
                    {
                        "failure_message": Status.AUTH_ERROR.value
                        + AuthFailure.ASSET.value,
                        "errors": "User "
                        + request.user.username
                        + " does not have asset permission in datacenter id="
                        + str(rack.datacenter.id),
                    },
                    status=HTTPStatus.UNAUTHORIZED,
                )
            model = ITModel.objects.get(id=asset_data["model"])
            try:
                # TODO: add chassis validation to bulk
                validate_asset_location_in_rack(
                    asset_serializer.validated_data["rack"].id,
                    asset_serializer.validated_data["rack_position"],
                    model.height,
                    asset_id=None,
                )
            except LocationException as error:
                if "asset_number" in asset_data and asset_data["asset_number"]:
                    asset_name = str(asset_data["asset_number"])
                elif "hostname" in asset_data and asset_data["hostname"]:
                    asset_name = asset_data["hostname"]
                else:
                    asset_name = ""
                return JsonResponse(
                    {
                        "failure_message": Status.IMPORT_ERROR.value
                        + "Asset "
                        + asset_name
                        + " is invalid. "
                        + str(error)
                    },
                    status=HTTPStatus.BAD_REQUEST,
                )
            else:
                assets_to_add.append(
                    {"asset_serializer": asset_serializer, "asset_data": asset_data}
                )
    try:
        no_infile_location_conflicts(asset_datas)
    except LocationException as error:
        failure_message = (
            Status.IMPORT_ERROR.value
            + "Location conflicts among assets in import file. "
            + str(error)
        )
        return JsonResponse(
            {"failure_message": failure_message}, status=HTTPStatus.BAD_REQUEST
        )
    records_added = 0
    for asset_to_add in assets_to_add:
        records_added += 1
        asset_serializer = asset_to_add["asset_serializer"]
        asset_data = asset_to_add["asset_data"]
        asset_added = asset_serializer.save()
        try:
            save_power_connections(asset_data=asset_data, asset_id=asset_added.id)
        except PowerConnectionException as error:
            warning_message += "Some power connections couldn't be saved. " + str(error)
    records_ignored = 0
    modifications_to_approve = []
    for potential_modification in potential_modifications:
        new_data = potential_modification["new_data"]
        new_data["model"] = ITModelSerializer(
            ITModel.objects.get(id=new_data["model"])
        ).data
        new_data["rack"] = RackSerializer(Rack.objects.get(id=new_data["rack"])).data
        existing_data = RecursiveAssetSerializer(
            potential_modification["existing_asset"]
        ).data
        # macs and connections aren't specified in this file, so ignore them
        del existing_data["mac_addresses"]
        del existing_data["network_connections"]
        del existing_data["network_graph"]
        if records_are_identical(existing_data, new_data):
            records_ignored += 1
        else:
            new_data["id"] = existing_data["id"]
            for field in existing_data.keys():
                if field not in new_data:
                    new_data[field] = None
            modifications_to_approve.append(
                {"existing": existing_data, "modified": new_data}
            )
    response = {
        "added": records_added,
        "ignored": records_ignored,
        "modifications": modifications_to_approve,
    }
    if warning_message:
        response["warning_message"] = warning_message
    log_bulk_upload(
        request.user,
        ElementType.ASSET,
        records_added,
        records_ignored,
        len(modifications_to_approve),
    )
    return JsonResponse(response, status=HTTPStatus.OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def asset_bulk_approve(request):
    """
    Bulk approve many assets to modify
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
    asset_datas = data["approved_modifications"]
    # Don't do any validation here because we know we sent valid assets to the
    # frontend, and they should send the same ones back
    warning_message = ""
    for asset_data in asset_datas:
        existing_asset = Asset.objects.get(id=asset_data["id"])
        for field in asset_data.keys():
            # This is assumed to have all fields, and with null values for
            # blank ones. That's how it's returned in bulk-upload
            if field == "model":
                value = ITModel.objects.get(id=asset_data[field]["id"])
            elif field == "rack":
                value = Rack.objects.get(id=asset_data[field]["id"])
            else:
                value = asset_data[field]
            setattr(existing_asset, field, value)
        existing_asset.save()
        try:
            save_power_connections(asset_data=asset_data, asset_id=existing_asset.id)
        except PowerConnectionException as error:
            warning_message += "Some power connections couldn't be saved. " + str(error)
    log_bulk_approve(request.user, ElementType.ASSET, len(asset_datas))
    if warning_message:
        return JsonResponse({"warning_message": warning_message}, status=HTTPStatus.OK)
    else:
        return JsonResponse(
            {"success_message": "Assets successfully modified. "}, status=HTTPStatus.OK
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def asset_bulk_export(request):
    """
    List all assets in csv form, in accordance with Bulk Spec.
    """
    assets_query = Asset.objects
    try:
        filter_args = get_filter_arguments(request.data)
    except Exception as error:
        return JsonResponse(
            {
                "failure_message": Status.EXPORT_ERROR.value
                + GenericFailure.FILTER.value,
                "errors": str(error),
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    for filter_arg in filter_args:
        assets_query = assets_query.filter(**filter_arg)

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
    assets = assets_query.order_by(*sort_args)

    serializer = BulkAssetSerializer(assets, many=True)
    csv_string = StringIO()
    fields = serializer.data[0].keys()
    csv_writer = csv.DictWriter(csv_string, fields)
    csv_writer.writeheader()
    csv_writer.writerows(serializer.data)
    return JsonResponse({"export_csv": csv_string.getvalue()}, status=HTTPStatus.OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def asset_page_count(request):
    """
    Return total number of pages according to page size, which must be
    specified as query parameter.
    """
    (change_plan, failure_response) = get_change_plan(
        request.query_params.get("change_plan")
    )
    if failure_response:
        return failure_response
    if change_plan:
        return get_page_count_response_for_cp(request, change_plan, stored=False)
    else:
        racked_assets = Asset.objects.filter(offline_storage_site__isnull=True)
        return get_page_count_response(
            Asset,
            request.query_params,
            data_for_filters=request.data,
            premade_object_query=racked_assets,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def offline_storage_asset_page_count(request):
    """
    Return total number of pages according to page size, which must be
    specified as query parameter.
    """
    (change_plan, failure_response) = get_change_plan(
        request.query_params.get("change_plan")
    )
    if failure_response:
        return failure_response
    if change_plan:
        return get_page_count_response_for_cp(request, change_plan, stored=True)
    else:
        stored_assets = Asset.objects.filter(offline_storage_site__isnull=False)
        return get_page_count_response(
            Asset,
            request.query_params,
            data_for_filters=request.data,
            premade_object_query=stored_assets,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def asset_fields(request):
    """
    Return all fields on the AssetSerializer.
    """
    return JsonResponse(
        {
            "fields": [
                "asset_number",
                "hostname",
                "model",
                "rack",
                "rack_position",
                "owner",
                "comment",
            ]
        },
        status=HTTPStatus.OK,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def asset_number(request):
    """
    Get a suggest asset number for Asset creation
    """
    return JsonResponse({"asset_number": get_next_available_asset_number()})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def get_asset_from_barcode(request):
    """
    Parse barcode as base64 encoded string for asset number then return
    corresponding live asset with that number, if it exists
    """
    data = JSONParser().parse(request)
    if "img_string" not in data:
        return JsonResponse(
            {
                "failure_message": "ERROR: Request must contain base64-encoded image string"
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    img = b64decode(data["img_string"])
    img_file = BytesIO(img)
    image = Image.open(img_file).convert("RGB")
    opencv_img = numpy.array(image)
    opencv_img = opencv_img[:, :, ::-1].copy()
    barcodes = decode(opencv_img)
    if len(barcodes) < 1:
        return JsonResponse(
            {"warning_message": "WARNING: No barcode detected"},
            status=HTTPStatus.BAD_REQUEST,
        )
    barcode_data = ""
    try:
        for barcode in barcodes:
            barcode_data = barcode.data.decode("utf-8")
    except Exception as error:
        return JsonResponse(
            {"failure_message": "ERROR: Could not decode barcode value"},
            status=HTTPStatus.BAD_REQUEST,
        )
    if not barcode_data.isdigit():
        return JsonResponse(
            {"failure_message": "ERROR: Barcode contains non-numeric characters"},
            status=HTTPStatus.BAD_REQUEST,
        )
    try:
        asset = Asset.objects.get(asset_number=barcode_data)
    except Asset.DoesNotExist:
        return JsonResponse(
            {
                "failure_message": Status.ERROR.value
                + "Asset"
                + GenericFailure.DOES_NOT_EXIST.value,
                "errors": "No existing asset with asset_number=" + str(barcode_data),
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    serializer = RecursiveAssetSerializer(asset)
    return JsonResponse(
        {"barcode_data": barcode_data, "asset_data": serializer.data},
        status=HTTPStatus.OK,
    )
