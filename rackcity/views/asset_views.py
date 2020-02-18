from django.http import HttpResponse, JsonResponse
from rackcity.models import Asset, ITModel, Rack, NetworkPort
from django.core.exceptions import ObjectDoesNotExist
from rackcity.api.serializers import (
    AssetSerializer,
    RecursiveAssetSerializer,
    BulkAssetSerializer,
    ITModelSerializer,
    RackSerializer
)
from rest_framework.decorators import permission_classes, api_view
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.parsers import JSONParser
from rest_framework.pagination import PageNumberPagination
from http import HTTPStatus
import math
import csv
from io import StringIO
from rackcity.views.rackcity_utils import (
    validate_asset_location,
    validate_location_modification,
    no_infile_location_conflicts,
    records_are_identical,
    LocationException,
    MacAddressException,
    get_sort_arguments,
    get_filter_arguments,
)


@api_view(['GET'])  # DEPRECATED !
@permission_classes([IsAuthenticated])
def asset_list(request):
    """
    List all assets.
    """
    if request.method == 'GET':
        assets = Asset.objects.all()
        serializer = RecursiveAssetSerializer(assets, many=True)
        return JsonResponse({"assets": serializer.data})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def asset_many(request):
    """
    List many assets. If page is not specified as a query parameter, all
    assets are returned. If page is specified as a query parameter, page
    size must also be specified, and a page of assets will be returned.
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

    assets_query = Asset.objects

    try:
        filter_args = get_filter_arguments(request.data)
    except Exception as error:
        return JsonResponse(
            {"failure_message": "Filter error: " + str(error)},
            status=HTTPStatus.BAD_REQUEST
        )
    for filter_arg in filter_args:
        assets_query = assets_query.filter(**filter_arg)

    try:
        sort_args = get_sort_arguments(request.data)
    except Exception as error:
        return JsonResponse(
            {"failure_message": "Sort error: " + str(error)},
            status=HTTPStatus.BAD_REQUEST
        )
    assets = assets_query.order_by(*sort_args)

    if should_paginate:
        paginator = PageNumberPagination()
        paginator.page_size = request.query_params.get('page_size')
        try:
            page_of_assets = paginator.paginate_queryset(assets, request)
        except Exception as error:
            failure_message += "Invalid page requested: " + str(error)
            return JsonResponse(
                {"failure_message": failure_message},
                status=HTTPStatus.BAD_REQUEST,
            )
        assets_to_serialize = page_of_assets
    else:
        assets_to_serialize = assets

    serializer = RecursiveAssetSerializer(
        assets_to_serialize,
        many=True,
    )
    return JsonResponse(
        {"assets": serializer.data},
        status=HTTPStatus.OK,
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def asset_detail(request, id):
    """
    Retrieve a single asset.
    """

    try:
        asset = Asset.objects.get(id=id)
    except Asset.DoesNotExist:
        failure_message = "No model exists with id=" + str(id)
        return JsonResponse(
            {"failure_message": failure_message},
            status=HTTPStatus.BAD_REQUEST,
        )

    serializer = RecursiveAssetSerializer(asset)
    # slap the mac addresses and all the connections on here
    data = serializer.data
    data['mac_addresses'] = get_mac_addresses(asset_id=id)
    return JsonResponse(data, status=HTTPStatus.OK)


def get_mac_addresses(asset_id):
    try:
        ports = NetworkPort.objects.filter(asset=asset_id)
    except ObjectDoesNotExist:
        return
    mac_addresses = {}
    for port in ports:
        if port.mac_address:
            mac_addresses[port.port_name] = port.mac_address
    return mac_addresses


@api_view(['POST'])
@permission_classes([IsAdminUser])
def asset_add(request):  # need to make network and power connections here
    """
    Add a new asset.
    """
    data = JSONParser().parse(request)
    failure_message = ""
    if 'id' in data:
        failure_message += "Don't include id when adding an asset. "

    serializer = AssetSerializer(data=data)
    if not serializer.is_valid(raise_exception=False):
        failure_message += str(serializer.errors)
    if failure_message == "":
        rack_id = serializer.validated_data['rack'].id
        rack_position = serializer.validated_data['rack_position']
        height = serializer.validated_data['model'].height
        try:
            validate_asset_location(rack_id, rack_position, height)
        except LocationException as error:
            failure_message += str(error)
            return JsonResponse(
                {"failure_message": failure_message},
                status=HTTPStatus.BAD_REQUEST,
            )
    if failure_message == "":
        try:
            asset = serializer.save()
        except Exception as error:
            failure_message += str(error)
        else:
            try:
                save_mac_addresses(
                    asset_data=data,
                    asset_id=asset.id
                )
            except MacAddressException as error:
                failure_message += "Some mac addresses couldn't be saved. " + \
                    str(error)
                return JsonResponse(
                    {"failure_message": failure_message},
                    status=HTTPStatus.BAD_REQUEST,
                )
            else:
                return HttpResponse(status=HTTPStatus.CREATED)
    failure_message = "Request was invalid. " + failure_message
    return JsonResponse(
        {"failure_message": failure_message},
        status=HTTPStatus.BAD_REQUEST,
    )


def save_mac_addresses(asset_data, asset_id):
    if 'mac_addresses' not in asset_data:
        return
    mac_address_assignments = asset_data['mac_addresses']
    failure_message = ""
    for port_name in mac_address_assignments.keys():
        try:
            network_port = NetworkPort.objects.get(
                asset=asset_id,
                port_name=port_name
            )
        except ObjectDoesNotExist:
            failure_message += "Port name '"+port_name+"' is not valid. "
        else:
            mac_address = mac_address_assignments[port_name]
            network_port.mac_address = mac_address
            try:
                network_port.save()
            except Exception as error:
                failure_message += \
                    "Mac address '" + \
                    mac_address + \
                    "' is not valid. "
    if failure_message:
        raise MacAddressException(failure_message)


@api_view(['POST'])
@permission_classes([IsAdminUser])
# need to make network and power connections here
def asset_modify(request):
    """
    Modify a single existing asset
    """
    data = JSONParser().parse(request)
    if 'id' not in data:
        return JsonResponse(
            {"failure_message": "Must include 'id' when modifying an " +
             "asset. "},
            status=HTTPStatus.BAD_REQUEST,
        )

    id = data['id']
    try:
        existing_asset = Asset.objects.get(id=id)
    except ObjectDoesNotExist:
        return JsonResponse(
            {"failure_message": "No existing asset with id=" +
                str(id) + ". "},
            status=HTTPStatus.BAD_REQUEST,
        )

    try:
        validate_location_modification(data, existing_asset)
    except Exception as error:
        return JsonResponse(
            {"failure_message": "Invalid location change: " + str(error)},
            status=HTTPStatus.BAD_REQUEST,
        )

    for field in data.keys():
        if field == 'model':
            value = ITModel.objects.get(id=data[field])
        elif field == 'rack':
            value = Rack.objects.get(id=data[field])
        elif field == 'hostname' and data['hostname']:
            assets_with_hostname = Asset.objects.filter(
                hostname__iexact=data[field]
            )
            if (
                len(assets_with_hostname) > 0
                and assets_with_hostname[0].id != id
            ):
                return JsonResponse(
                    {"failure_message": "Asset with hostname '" +
                        data[field].lower() + "' already exists."},
                    status=HTTPStatus.BAD_REQUEST,
                )
            value = data[field]
        elif field == 'asset_number':
            assets_with_asset_number = Asset.objects.filter(
                asset_number=data[field]
            )
            if (
                len(assets_with_asset_number) > 0
                and assets_with_asset_number[0].id != id
            ):
                return JsonResponse(
                    {"failure_message": "Asset with asset number '" +
                        str(data[field]) + "' already exists."},
                    status=HTTPStatus.BAD_REQUEST,
                )
            value = data[field]
        else:
            value = data[field]
        setattr(existing_asset, field, value)

    try:
        existing_asset.save()
        # will need to save mac addresses and connections here
    except Exception as error:
        return JsonResponse(
            {"failure_message": "Invalid updates: " + str(error)},
            status=HTTPStatus.BAD_REQUEST,
        )
    else:
        try:
            save_mac_addresses(
                asset_data=data,
                asset_id=existing_asset.id
            )
        except MacAddressException as error:
            failure_message += "Some mac addresses couldn't be saved. " + \
                str(error)
            return JsonResponse(
                {"failure_message": failure_message},
                status=HTTPStatus.BAD_REQUEST,
            )
        else:
            return HttpResponse(status=HTTPStatus.OK)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def asset_delete(request):  # need to delete network and power connections here
    """
    Delete a single existing asset
    """
    data = JSONParser().parse(request)
    failure_message = ""
    if 'id' not in data:
        failure_message += "Must include id when deleting an asset. "
    else:
        id = data['id']
        try:
            existing_asset = Asset.objects.get(id=id)
        except ObjectDoesNotExist:
            failure_message += "No existing asset with id="+str(id)+". "

    if failure_message == "":
        try:
            existing_asset.delete()
            return HttpResponse(status=HTTPStatus.OK)
        except Exception as error:
            failure_message = failure_message + str(error)

    failure_message = "Request was invalid. " + failure_message

    return JsonResponse(
        {"failure_message": failure_message},
        status=HTTPStatus.BAD_REQUEST,
    )


@api_view(['POST'])
@permission_classes([IsAdminUser])
def asset_bulk_upload(request):  # need to make network and power connections here
    """
    Bulk upload many assets to add or modify
    """
    data = JSONParser().parse(request)
    if 'assets' not in data:
        return JsonResponse(
            {"failure_message": "Bulk upload request should have a parameter 'assets'"},
            status=HTTPStatus.BAD_REQUEST
        )
    asset_datas = data['assets']
    assets_to_add = []
    potential_modifications = []
    hostnames_in_import = set()
    for asset_data in asset_datas:
        if (
            'vendor' not in asset_data
            or 'model_number' not in asset_data
        ):
            return JsonResponse(
                {"failure_message": "Asset records must include 'vendor' and 'model_number'. "},
                status=HTTPStatus.BAD_REQUEST
            )
        try:
            model = ITModel.objects.get(
                vendor=asset_data['vendor'],
                model_number=asset_data['model_number']
            )
        except ObjectDoesNotExist:
            failure_message = "Model does not exist: " + \
                "vendor="+asset_data['vendor'] + \
                ", model_number="+asset_data['model_number']
            return JsonResponse(
                {"failure_message": failure_message},
                status=HTTPStatus.BAD_REQUEST
            )
        asset_data['model'] = model.id
        del asset_data['vendor']
        del asset_data['model_number']
        if 'rack' not in asset_data:
            return JsonResponse(
                {"failure_message": "Asset records must include 'rack'"},
                status=HTTPStatus.BAD_REQUEST
            )
        try:
            row_letter = asset_data['rack'][:1].upper()
            rack_num = asset_data['rack'][1:]
            rack = Rack.objects.get(row_letter=row_letter, rack_num=rack_num)
        except ObjectDoesNotExist:
            failure_message = "Provided rack doesn't exist: " + \
                asset_data['rack']
            return JsonResponse(
                {"failure_message": failure_message},
                status=HTTPStatus.BAD_REQUEST
            )
        asset_data['rack'] = rack.id
        asset_serializer = AssetSerializer(
            data=asset_data)  # non-recursive to validate
        if not asset_serializer.is_valid():
            errors = asset_serializer.errors
            if not (  # if the only error is the hostname uniqueness, that's fine - it's a modify
                len(errors.keys()) == 1
                and 'hostname' in errors
                and len(errors['hostname']) == 1
                and errors['hostname'][0].code == 'unique'
            ):
                failure_message = str(asset_serializer.errors)
                failure_message = "At least one provided asset was not valid. "+failure_message
                return JsonResponse(
                    {"failure_message": failure_message},
                    status=HTTPStatus.BAD_REQUEST
                )

        # Check that all hostnames in file are case insensitive unique
        asset_data_hostname_lower = asset_data['hostname'].lower()
        if asset_data_hostname_lower in hostnames_in_import:
            failure_message = "Hostname must be unique, but '" + \
                asset_data_hostname_lower + \
                "' appears more than once in import. "
            return JsonResponse(
                {"failure_message": failure_message},
                status=HTTPStatus.BAD_REQUEST
            )
        else:
            hostnames_in_import.add(asset_data_hostname_lower)

        existing_asset_filtered = Asset.objects.filter(
            hostname__iexact=asset_data['hostname'])
        if len(existing_asset_filtered) == 1:
            # asset with same (case insensitive) hostname already exists
            existing_asset = existing_asset_filtered[0]
            try:
                validate_location_modification(
                    asset_data, existing_asset)
            except Exception:
                # this could be problematic if neither hostame or asset number isn't there
                failure_message = "Asset " + \
                    str(asset_data['asset_number']) + \
                    " would conflict location with an existing asset. "
                return JsonResponse(
                    {"failure_message": failure_message},
                    status=HTTPStatus.BAD_REQUEST
                )
            potential_modifications.append(
                {
                    "existing_asset": existing_asset,
                    "new_data": asset_data
                }
            )
        else:
            # asset with this hostname does not yet exist
            model = ITModel.objects.get(id=asset_data['model'])
            try:
                validate_asset_location(
                    asset_serializer.validated_data['rack'].id,
                    asset_serializer.validated_data['rack_position'],
                    model.height,
                    asset_id=None,
                )
            except LocationException as error:
                # this could be problematic if neither hostame or asset number isn't there
                failure_message = "Asset " + \
                    str(asset_data['asset_number']) + \
                    " is invalid. " + str(error)
                return JsonResponse(
                    {"failure_message": failure_message},
                    status=HTTPStatus.BAD_REQUEST
                )
            else:
                assets_to_add.append(asset_serializer)
    try:
        no_infile_location_conflicts(asset_datas)
    except LocationException as error:
        failure_message = "Location conflicts among assets in import file. " + \
            str(error)
        return JsonResponse(
            {"failure_message": failure_message},
            status=HTTPStatus.BAD_REQUEST
        )
    records_added = 0
    for asset_to_add in assets_to_add:
        records_added += 1
        asset_to_add.save()
        # will need to save mac addresses and connections here
    records_ignored = 0
    modifications_to_approve = []
    for potential_modification in potential_modifications:
        new_data = potential_modification['new_data']
        new_data['model'] = ITModelSerializer(
            ITModel.objects.get(id=new_data['model'])
        ).data
        new_data['rack'] = RackSerializer(
            Rack.objects.get(id=new_data['rack'])
        ).data
        existing_data = RecursiveAssetSerializer(
            potential_modification['existing_asset']
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
def asset_bulk_approve(request):  # need to make network and power connections here
    """
    Bulk approve many assets to modify
    """
    data = JSONParser().parse(request)
    if 'approved_modifications' not in data:
        return JsonResponse(
            {"failure_message": "Bulk approve request should have a parameter 'approved_modifications'"},
            status=HTTPStatus.BAD_REQUEST
        )
    asset_datas = data['approved_modifications']
    # Don't do any validation here because we know we sent valid assets to the frontend,
    # and they should send the same ones back
    for asset_data in asset_datas:
        existing_asset = Asset.objects.get(
            id=asset_data['id'])
        for field in asset_data.keys():  # This is assumed to have all fields, and with null values for blank ones. That's how it's returned in bulk-upload
            if field == 'model':
                value = ITModel.objects.get(id=asset_data[field]['id'])
            elif field == 'rack':
                value = Rack.objects.get(id=asset_data[field]['id'])
            else:
                value = asset_data[field]
            setattr(existing_asset, field, value)
        existing_asset.save()
        # will need to save mac addresses and connections here
    return HttpResponse(status=HTTPStatus.OK)


@api_view(['POST'])
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
            {"failure_message": "Filter error: " + str(error)},
            status=HTTPStatus.BAD_REQUEST
        )
    for filter_arg in filter_args:
        assets_query = assets_query.filter(**filter_arg)

    try:
        sort_args = get_sort_arguments(request.data)
    except Exception as error:
        return JsonResponse(
            {"failure_message": "Sort error: " + str(error)},
            status=HTTPStatus.BAD_REQUEST
        )
    assets = assets_query.order_by(*sort_args)

    serializer = BulkAssetSerializer(assets, many=True)
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
def asset_page_count(request):
    """
    Return total number of pages according to page size, which must be
    specified as query parameter.
    """
    if (
        not request.query_params.get('page_size')
        or int(request.query_params.get('page_size')) <= 0
    ):
        return JsonResponse(
            {"failure_message": "Must specify positive integer page_size."},
            status=HTTPStatus.BAD_REQUEST,
        )
    page_size = int(request.query_params.get('page_size'))
    assets_query = Asset.objects
    try:
        filter_args = get_filter_arguments(request.data)
    except Exception as error:
        return JsonResponse(
            {"failure_message": "Filter error: " + str(error)},
            status=HTTPStatus.BAD_REQUEST
        )
    for filter_arg in filter_args:
        assets_query = assets_query.filter(**filter_arg)
    asset_count = assets_query.count()
    page_count = math.ceil(asset_count / page_size)
    return JsonResponse({"page_count": page_count})


@api_view(['GET'])
def asset_fields(request):
    """
    Return all fields on the AssetSerializer. 
    """
    return JsonResponse(
        {"fields": [
            'asset_number',
            'hostname',
            'model',
            'rack',
            'rack_position',
            'owner',
            'comment',
        ]},
        status=HTTPStatus.OK,
    )
