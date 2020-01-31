from rest_framework.parsers import JSONParser
from django.http import HttpResponse, JsonResponse
from django.core.exceptions import ObjectDoesNotExist
from rackcity.models import ITModel, ITInstance
from rackcity.api.serializers import ITModelSerializer, ITInstanceSerializer
from rest_framework.decorators import permission_classes, api_view
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.pagination import PageNumberPagination
from http import HTTPStatus
import math
from rackcity.views.rackcity_utils import (
    is_location_full,
    records_are_identical,
    get_sort_arguments,
    get_filter_arguments,
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
            if not model_height_change_valid(data, existing_model):
                failure_message = "Height change of model causes conflicts. "
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


def model_height_change_valid(new_model_data, existing_model):
    if 'height' not in new_model_data:
        return True
    if new_model_data['height'] <= existing_model.height:
        return True
    else:
        instances = ITInstance.objects.filter(model=existing_model.id)
        for instance in instances:
            if is_location_full(
                instance.rack.id,
                instance.elevation,
                new_model_data['height'],
                instance.id
            ):
                return False
        return True


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
            instances = ITInstance.objects.filter(model=id)
            if instances:
                failure_message += "Cannot delete this model because instances of it exist. "
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
def model_page(request):
    """
    List a page of models. Page and page size must be specified as query
    parameters.
    """

    failure_message = ""

    if not request.query_params.get('page'):
        failure_message += "Must specify page. "
    if not request.query_params.get('page_size'):
        failure_message += "Must specify page_size. "
    elif int(request.query_params.get('page_size')) <= 0:
        failure_message += "The page_size must be an integer greater than 0. "

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
    models_query = models_query.filter(**filter_args)

    try:
        sort_args = get_sort_arguments(request.data)
    except Exception as error:
        return JsonResponse(
            {"failure_message": "Sort error: " + str(error)},
            status=HTTPStatus.BAD_REQUEST
        )
    models = models_query.order_by(*sort_args)

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

    serializer = ITModelSerializer(page_of_models, many=True)
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
        instances = ITInstance.objects.filter(model=id)
        instances_serializer = ITInstanceSerializer(instances, many=True)
        model_detail = {
            "model": model_serializer.data,
            "instances": instances_serializer.data
        }
        return JsonResponse(model_detail, status=HTTPStatus.OK)
    except ITModel.DoesNotExist:
        failure_message = "No model exists with id="+str(id)
        return JsonResponse({"failure_message": failure_message}, status=HTTPStatus.NOT_FOUND)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def model_vendors(request):
    """
    Get all known vendors.
    """
    vendors = ITModel.objects.values('vendor').distinct()
    vendors_names = [vendor['vendor'] for vendor in vendors]
    return JsonResponse(
        {"vendors": vendors_names},
        status=HTTPStatus.OK
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
            failure_message = "At least one provided model was not valid. "+failure_message
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
            if not model_height_change_valid(model_data, existing_model):
                failure_message = \
                    "Height change of this model causes conflicts: " + \
                    "vendor="+model_data['vendor'] + \
                    ", model_number="+model_data['model_number']
                return JsonResponse(
                    {"failure_message": failure_message},
                    status=HTTPStatus.NOT_ACCEPTABLE
                )
            potential_modifications.append(
                {"existing_model": existing_model, "new_data": model_data})
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


@api_view(['GET'])
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
    model_count = ITModel.objects.all().count()
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
            'num_ethernet_ports',
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
    if(request.user.is_superuser):
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
