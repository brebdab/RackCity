from django.http import JsonResponse
from rest_framework.parsers import JSONParser
from rackcity.models import Asset, DecommissionedAsset
from rackcity.permissions.permissions import user_has_asset_permission
from rackcity.api.serializers import (
    RecursiveAssetSerializer,
    AddDecommissionedAssetSerializer,
    GetDecommissionedAssetSerializer,
)
from rest_framework.decorators import permission_classes, api_view
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from http import HTTPStatus
from rackcity.utils.errors_utils import (
    Status,
    GenericFailure,
    parse_serializer_errors,
    parse_save_validation_error,
    AuthFailure,
)
from rackcity.utils.query_utils import (
    get_sort_arguments,
    get_filter_arguments,
)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def decommission_asset(request):
    """
    Decommission a live asset
    """
    data = JSONParser().parse(request)
    if 'id' not in data:
        return JsonResponse(
            {
                "failure_message":
                    Status.DECOMMISSION_ERROR.value + GenericFailure.INTERNAL.value,
                "errors": "Must include 'id' when decommissioning an asset"
            },
            status=HTTPStatus.BAD_REQUEST
        )
    id = data['id']
    try:
        asset = Asset.objects.get(id=id)
    except Asset.DoesNotExist:
        return JsonResponse(
            {
                "failure_message":
                    Status.ERROR.value +
                    "Asset" + GenericFailure.DOES_NOT_EXIST.value,
                "errors": "No existing asset with id="+str(id)
            },
            status=HTTPStatus.BAD_REQUEST
        )
    if not user_has_asset_permission(
        request.user,
        asset.rack.datacenter
    ):
        return JsonResponse(
            {
                "failure_message":
                    Status.AUTH_ERROR.value + AuthFailure.ASSET.value,
                "errors":
                    "User " + request.user.username +
                    " does not have asset permission in datacenter id="
                    + str(asset.rack.datacenter.id)
            },
            status=HTTPStatus.UNAUTHORIZED
        )
    asset_data = RecursiveAssetSerializer(asset).data
    asset_data['live_id'] = asset_data['id']
    del asset_data['id']
    asset_data['decommissioning_user'] = str(request.user)
    decommissioned_asset = AddDecommissionedAssetSerializer(data=asset_data)
    if not decommissioned_asset.is_valid(raise_exception=False):
        return JsonResponse(
            {
                "failure_message":
                    Status.INVALID_INPUT.value +
                    parse_serializer_errors(decommissioned_asset.errors),
                "errors": str(decommissioned_asset.errors)
            },
            status=HTTPStatus.BAD_REQUEST
        )
    try:
        decommissioned_asset.save()
    except Exception as error:
        return JsonResponse(
            {
                "failure_message":
                    Status.DECOMMISSION_ERROR.value +
                    parse_save_validation_error(
                        error,
                        "Decommissioned Asset "
                    ),
                "errors": str(error)
            },
            status=HTTPStatus.BAD_REQUEST
        )
    else:
        asset.delete()
        return JsonResponse(
            {
                "success_message": "Asset successfully decommissioned. "
            },
            status=HTTPStatus.OK
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def decommissioned_asset_many(request):
    """
    List many decommissioned assets. If page is not specified as a query parameter, all
    assets are returned. If page is specified as a query parameter, page
    size must also be specified, and a page of assets will be returned.
    """

    errors = []

    should_paginate = not(
        request.query_params.get('page') is None
        and request.query_params.get('page_size') is None
    )

    if should_paginate:
        if not request.query_params.get('page'):
            errors.append("Must specify field 'page' on " +
                          "paginated requests.")
        elif not request.query_params.get('page_size'):
            errors.append("Must specify field 'page_size' on " +
                          "paginated requests.")
        elif int(request.query_params.get('page_size')) <= 0:
            errors.append("Field 'page_size' must be an integer " +
                          "greater than 0.")

    if len(errors) > 0:
        return JsonResponse(
            {
                "failure_message":
                    Status.ERROR.value + GenericFailure.PAGE_ERROR.value,
                "errors": " ".join(errors)
            },
            status=HTTPStatus.BAD_REQUEST,
        )

    decomissioned_assets_query = DecommissionedAsset.objects
    try:
        # TODO: create a date range filter
        filter_args = get_filter_arguments(request.data)
    except Exception as error:
        return JsonResponse(
            {
                "failure_message":
                    Status.ERROR.value + GenericFailure.FILTER.value,
                "errors": str(error)
            },
            status=HTTPStatus.BAD_REQUEST
        )
    for filter_arg in filter_args:
        decomissioned_assets_query = decomissioned_assets_query.filter(
            **filter_arg)

    try:
        sort_args = get_sort_arguments(request.data)
    except Exception as error:
        return JsonResponse(
            {
                "failure_message":
                    Status.ERROR.value + GenericFailure.SORT.value,
                "errors": str(error)
            },
            status=HTTPStatus.BAD_REQUEST
        )
    decomissioned_assets = decomissioned_assets_query.order_by(*sort_args)

    if should_paginate:
        paginator = PageNumberPagination()
        paginator.page_size = request.query_params.get('page_size')
        try:
            page_of_decomissioned_assets = paginator.paginate_queryset(
                decomissioned_assets, request)
        except Exception as error:
            return JsonResponse(
                {
                    "failure_message":
                        Status.ERROR.value + GenericFailure.PAGE_ERROR.value,
                    "errors": str(error)
                },
                status=HTTPStatus.BAD_REQUEST,
            )
        decomissioned_assets_to_serialize = page_of_decomissioned_assets
    else:
        decomissioned_assets_to_serialize = decomissioned_assets

    serializer = GetDecommissionedAssetSerializer(
        decomissioned_assets_to_serialize,
        many=True,
    )
    # TODO: it may be preferred to make this key "assets" so it's easier to repurpose front end element table code
    return JsonResponse(
        {"assets": serializer.data},
        status=HTTPStatus.OK,
    )
