from rest_framework.parsers import JSONParser
from django.http import HttpResponse, JsonResponse
from django.core.exceptions import ObjectDoesNotExist
from rackcity.models import ITModel, Asset
from rackcity.api.serializers import (
    RecursiveAssetSerializer,
    ITModelSerializer,
    BulkITModelSerializer
)
from rest_framework.decorators import permission_classes, api_view
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.pagination import PageNumberPagination
from http import HTTPStatus
import math
import csv
from io import StringIO
from rackcity.views.rackcity_utils import (
    validate_asset_location,
    records_are_identical,
    get_sort_arguments,
    get_filter_arguments,
    LocationException,
)


@api_view(['GET'])
def model_list(request):  # DEPRECATED!
    """
    List all models.
    """
    if request.method == 'GET':
        # print(request.auth)
        models = ITModel.objects.all()
        serializer = ITModelSerializer(models, many=True)
        return JsonResponse(serializer.data, safe=False)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def model_add(request):
    """
    Add a new model
    """
    data = JSONParser().parse(request)
    failure_message = ""
    if 'id' in data:
        failure_message = failure_message + "Don't include id when adding a model. "
    serializer = ITModelSerializer(data=data)
    if not serializer.is_valid(raise_exception=False):
        failure_message = failure_message + str(serializer.errors)
    if failure_message == "":
        try:
            serializer.save()
            return HttpResponse(status=HTTPStatus.CREATED)
        except Exception as error:
            failure_message = failure_message + str(error)

    failure_message = "Request was invalid. " + failure_message
    return JsonResponse({
        "failure_message": failure_message
    },
        status=HTTPStatus.NOT_ACCEPTABLE
    )


@api_view(['POST'])
@permission_classes([IsAdminUser])
def model_modify(request):
    """
    Modify an existing model
    """
    data = JSONParser().parse(request)
    failure_message = ""
    if 'id' not in data:
        failure_message += "Must include id when modifying a model. "
    else:
        id = data['id']
        try:
            existing_model = ITModel.objects.get(id=id)
        except ObjectDoesNotExist:
            failure_message += "No existing model with id="+str(id)+". "
        else:
            try:
                validate_model_height_change(data, existing_model)
            except LocationException as error:
                failure_message = "Height change of model causes conflicts. " + \
                    str(error)
                return JsonResponse(
                    {"failure_message": failure_message},
                    status=HTTPStatus.NOT_ACCEPTABLE
                )
            for field in data.keys():
                setattr(existing_model, field, data[field])
            try:
                existing_model.save()
                return HttpResponse(status=HTTPStatus.OK)
            except Exception as error:
                failure_message = failure_message + str(error)
    failure_message = "Request was invalid. " + failure_message
    return JsonResponse({
        "failure_message": failure_message
    },
        status=HTTPStatus.NOT_ACCEPTABLE
    )


def validate_model_height_change(new_model_data, existing_model):
    if 'height' not in new_model_data:
        return
    new_model_height = int(new_model_data['height'])
    if new_model_height <= existing_model.height:
        return
    else:
        assets = Asset.objects.filter(model=existing_model.id)
        for asset in assets:
            try:
                validate_asset_location(
                    asset.rack.id,
                    asset.rack_position,
                    new_model_height,
                    asset.id
                )
            except LocationException as error:
                raise error
        return


@api_view(['POST'])
@permission_classes([IsAdminUser])
def model_delete(request):
    """
    Delete an existing model
    """
    data = JSONParser().parse(request)
    failure_message = ""
    if 'id' not in data:
        failure_message += "Must include id when deleting a model. "
    else:
        id = data['id']
        try:
            existing_model = ITModel.objects.get(id=id)
        except ObjectDoesNotExist:
            failure_message += "No existing model with id="+str(id)+". "
        else:
            assets = Asset.objects.filter(model=id)
            if assets:
                failure_message += "Cannot delete this model because assets of it exist. "
            if failure_message == "":
                try:
                    existing_model.delete()
                    return HttpResponse(status=HTTPStatus.OK)
                except Exception as error:
                    failure_message = failure_message + str(error)
    failure_message = "Request was invalid. " + failure_message
    return JsonResponse({
        "failure_message": failure_message
    },
        status=HTTPStatus.NOT_ACCEPTABLE
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def model_many(request):
    """
    List many models. If page is not specified as a query parameter, all
    models are returned. If page is specified as a query parameter, page
    size must also be specified, and a page of models will be returned.
    """

    failure_message = ""

    should_paginate = not(
        request.query_params.get('page') is None
        and request.query_params.get('page_size') is None
    )

    if should_paginate:
        if not request.query_params.get('page'):
            failure_message += "Must specify field 'page' on " + \
                "paginated requests. "
        elif not request.query_params.get('page_size'):
            failure_message += "Must specify field 'page_size' on " + \
                "paginated requests. "
        elif int(request.query_params.get('page_size')) <= 0:
            failure_message += "Field 'page_size' must be an integer " + \
                "greater than 0. "

    if failure_message != "":
        return JsonResponse(
            {"failure_message": failure_message},
            status=HTTPStatus.BAD_REQUEST,
        )

    models_query = ITModel.objects

    try:
        filter_args = get_filter_arguments(request.data)
    except Exception as error:
        return JsonResponse(
            {"failure_message": "Filter error: " + str(error)},
            status=HTTPStatus.BAD_REQUEST
        )
    for filter_arg in filter_args:
        models_query = models_query.filter(**filter_arg)

    try:
        sort_args = get_sort_arguments(request.data)
    except Exception as error:
        return JsonResponse(
            {"failure_message": "Sort error: " + str(error)},
            status=HTTPStatus.BAD_REQUEST
        )
    models = models_query.order_by(*sort_args)

    if should_paginate:
        paginator = PageNumberPagination()
        paginator.page_size = request.query_params.get('page_size')
        try:
            page_of_models = paginator.paginate_queryset(models, request)
        except Exception:
            failure_message += "Invalid page requested. "
            return JsonResponse(
                {"failure_message": failure_message},
                status=HTTPStatus.BAD_REQUEST,
            )
        models_to_serialize = page_of_models
    else:
        models_to_serialize = models

    serializer = ITModelSerializer(models_to_serialize, many=True)
    return JsonResponse(
        {"models": serializer.data},
        status=HTTPStatus.OK,
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def model_detail(request, id):
    """
    Retrieve a single model.
    """
    try:
        model = ITModel.objects.get(id=id)
        model_serializer = ITModelSerializer(model)
        assets = Asset.objects.filter(model=id)
        assets_serializer = RecursiveAssetSerializer(
            assets,
            many=True,
        )
        model_detail = {
            "model": model_serializer.data,
            "assets": assets_serializer.data
        }
        return JsonResponse(model_detail, status=HTTPStatus.OK)
    except ITModel.DoesNotExist:
        failure_message = "No model exists with id="+str(id)
        return JsonResponse(
            {"failure_message": failure_message},
            status=HTTPStatus.NOT_FOUND
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def model_vendors(request):
    """
    Get all known vendors.
    """
    vendors_names = [name for name in ITModel.objects.values_list(
        'vendor', flat=True).distinct('vendor')]
    return JsonResponse(
        {"vendors": vendors_names},
        status=HTTPStatus.OK,
    )


@api_view(['POST'])
@permission_classes([IsAdminUser])
def model_bulk_upload(request):
    """
    Bulk upload many models to add or modify
    """
    data = JSONParser().parse(request)
    if 'models' not in data:
        return JsonResponse(
            {"failure_message": "Bulk upload request should have a parameter 'models'"},
            status=HTTPStatus.BAD_REQUEST
        )
    model_datas = data['models']
    models_to_add = []
    potential_modifications = []
    models_in_import = set()
    for model_data in model_datas:
        model_serializer = ITModelSerializer(data=model_data)
        if not model_serializer.is_valid():
            failure_message = str(model_serializer.errors)
            failure_message = "At least one provided model was not valid! "+failure_message
            return JsonResponse(
                {"failure_message": failure_message},
                status=HTTPStatus.BAD_REQUEST
            )
        if (model_data['vendor'], model_data['model_number']) in models_in_import:
            failure_message = "Vendor+model_number combination must be unique, but " + \
                "vendor="+model_data['vendor'] + \
                ", model_number="+model_data['model_number'] + \
                " appears more than once in import. "
            return JsonResponse(
                {"failure_message": failure_message},
                status=HTTPStatus.BAD_REQUEST
            )
        else:
            models_in_import.add(
                (model_data['vendor'],
                 model_data['model_number'])
            )
        try:
            existing_model = ITModel.objects.get(
                vendor=model_data['vendor'], model_number=model_data['model_number'])
        except ObjectDoesNotExist:
            models_to_add.append(model_serializer)
        else:
            try:
                validate_model_height_change(model_data, existing_model)
            except LocationException as error:
                failure_message = \
                    "Height change of this model causes conflicts: " + \
                    "vendor="+model_data['vendor'] + \
                    ", model_number="+model_data['model_number'] + \
                    ". " + \
                    str(error)
                return JsonResponse(
                    {"failure_message": failure_message},
                    status=HTTPStatus.NOT_ACCEPTABLE
                )
            potential_modifications.append(
                {
                    "existing_model": existing_model,
                    "new_data": model_serializer.validated_data
                }
            )
    records_added = 0
    for model_to_add in models_to_add:
        records_added += 1
        model_to_add.save()
    records_ignored = 0
    modifications_to_approve = []
    for potential_modification in potential_modifications:
        new_data = potential_modification['new_data']
        existing_data = ITModelSerializer(
            potential_modification['existing_model']
        ).data
        if records_are_identical(existing_data, new_data):
            records_ignored += 1
        else:
            new_data['id'] = existing_data['id']
            for field in existing_data.keys():
                if field not in new_data:
                    new_data[field] = None
            modifications_to_approve.append(
                {
                    "existing": existing_data,
                    "modified": new_data
                }
            )
    return JsonResponse(
        {
            "added": records_added,
            "ignored": records_ignored,
            "modifications": modifications_to_approve
        },
        status=HTTPStatus.OK
    )


@api_view(['POST'])
@permission_classes([IsAdminUser])
def model_bulk_approve(request):
    """
    Bulk approve many models to modify
    """
    data = JSONParser().parse(request)
    if 'approved_modifications' not in data:
        return JsonResponse(
            {"failure_message": "Bulk approve request should have a parameter 'approved_modifications'"},
            status=HTTPStatus.BAD_REQUEST
        )
    model_datas = data['approved_modifications']
    for model_data in model_datas:
        model_serializer = ITModelSerializer(data=model_data)
        if not model_serializer.is_valid():
            failure_message = "At least one modification was not valid. " + \
                str(model_serializer.errors)
            return JsonResponse(
                {"failure_message": failure_message},
                status=HTTPStatus.BAD_REQUEST
            )
    for model_data in model_datas:
        existing_model = ITModel.objects.get(id=model_data['id'])
        for field in model_data.keys():  # This is assumed to have all fields, and with null values for blank ones. That's how it's returned in bulk-upload
            setattr(existing_model, field, model_data[field])
        existing_model.save()
    return HttpResponse(status=HTTPStatus.OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def model_bulk_export(request):
    """
    List all models in csv form, in accordance with Bulk Spec.
    """
    models_query = ITModel.objects

    try:
        filter_args = get_filter_arguments(request.data)
    except Exception as error:
        return JsonResponse(
            {"failure_message": "Filter error: " + str(error)},
            status=HTTPStatus.BAD_REQUEST
        )
    for filter_arg in filter_args:
        models_query = models_query.filter(**filter_arg)

    try:
        sort_args = get_sort_arguments(request.data)
    except Exception as error:
        return JsonResponse(
            {"failure_message": "Sort error: " + str(error)},
            status=HTTPStatus.BAD_REQUEST
        )
    models = models_query.order_by(*sort_args)

    serializer = BulkITModelSerializer(models, many=True)
    csv_string = StringIO()
    fields = serializer.data[0].keys()
    csv_writer = csv.DictWriter(csv_string, fields)
    csv_writer.writeheader()
    csv_writer.writerows(serializer.data)
    return JsonResponse(
        {"export_csv": csv_string.getvalue()},
        status=HTTPStatus.OK,
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def model_page_count(request):
    """
    Return total number of pages according to page size, which must be
    specified as query parameter.
    """
    if not request.query_params.get('page_size') or int(request.query_params.get('page_size')) <= 0:
        return JsonResponse(
            {"failure_message": "Must specify positive integer page_size."},
            status=HTTPStatus.BAD_REQUEST,
        )
    page_size = int(request.query_params.get('page_size'))
    models_query = ITModel.objects
    try:
        filter_args = get_filter_arguments(request.data)
    except Exception as error:
        return JsonResponse(
            {"failure_message": "Filter error: " + str(error)},
            status=HTTPStatus.BAD_REQUEST
        )
    for filter_arg in filter_args:
        models_query = models_query.filter(**filter_arg)
    model_count = models_query.count()
    page_count = math.ceil(model_count / page_size)
    return JsonResponse({"page_count": page_count})


@api_view(['GET'])
def model_fields(request):
    """
    Return all fields on the ITModelSerializer. 
    """
    return JsonResponse(
        {"fields": [
            'vendor',
            'model_number',
            'height',
            'display_color',
            'network_ports',
            'num_power_ports',
            'cpu',
            'memory_gb',
            'storage',
            'comment',
        ]},
        status=HTTPStatus.OK,
    )


@api_view(['GET'])
def i_am_admin(request):
    print("yeah")
    if(request.user.is_staff):
        return JsonResponse({"is_admin": True})
    else:
        return JsonResponse({"is_admin": False})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def model_auth(request):  # DEPRECATED!
    """
    List all models, but requires user authentication in header.
    (Temporary for auth testing on front end)
    """
    if request.method == 'GET':
        models = ITModel.objects.all()
        serializer = ITModelSerializer(models, many=True)
        return JsonResponse(serializer.data, safe=False)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def model_admin(request):  # DEPRECATED!
    """
    List all models, but requires request comes from admin user.
    (Temporary for auth testing on front end)
    """
    if request.method == 'GET':
        models = ITModel.objects.all()
        serializer = ITModelSerializer(models, many=True)
        return JsonResponse(serializer.data, safe=False)
