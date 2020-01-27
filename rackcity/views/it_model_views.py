from rest_framework.parsers import JSONParser
from django.http import HttpResponse, JsonResponse
from django.core.exceptions import ObjectDoesNotExist
from rackcity.models import ITModel, ITInstance
from rackcity.api.serializers import ITModelSerializer, ITInstanceSerializer
from rest_framework.decorators import permission_classes, api_view
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.pagination import PageNumberPagination
from http import HTTPStatus


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

    models = ITModel.objects.all()
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


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def model_auth(request):
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
def model_admin(request):
    """
    List all models, but requires request comes from admin user.
    (Temporary for auth testing on front end)
    """
    if request.method == 'GET':
        models = ITModel.objects.all()
        serializer = ITModelSerializer(models, many=True)
        return JsonResponse(serializer.data, safe=False)


@api_view(['GET'])
def i_am_admin(request):
    print("yeah")
    if(request.user.is_superuser):
        print("yeah")
        return JsonResponse({"is_admin": True})
    else:
        print("nah")
        return JsonResponse({"is_admin": False})
