from base64 import b64decode
import csv
from django.core.exceptions import ObjectDoesNotExist
from django.http import JsonResponse
from http import HTTPStatus
from io import StringIO, BytesIO
from rackcity.api.serializers import (
    RecursiveAssetSerializer,
    BulkNetworkPortSerializer,
    normalize_bulk_network_data,
)
from rackcity.models import Asset, NetworkPort
from rackcity.utils.asset_utils import (
    save_mac_addresses,
    save_network_connections,
)
from rackcity.utils.errors_utils import (
    Status,
    GenericFailure,
    BulkFailure,
)
from rackcity.utils.exceptions import (
    MacAddressException,
    NetworkConnectionException,
    UserAssetPermissionException,
)
from rackcity.utils.log_utils import (
    log_bulk_upload,
    log_bulk_approve,
    ElementType,
)
from rackcity.utils.query_utils import (
    get_sort_arguments,
    get_filter_arguments,
)
from rackcity.utils.rackcity_utils import records_are_identical
from rackcity.permissions.permissions import validate_user_permission_on_existing_asset
import re
from rest_framework.decorators import permission_classes, api_view
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import JSONParser


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def network_bulk_upload(request):
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
    expected_fields = BulkNetworkPortSerializer.Meta.fields
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
    bulk_network_port_datas = []
    for row in csv_reader:
        bulk_network_port_datas.append(dict(row))
    num_ports_ignored = 0
    modifications_to_approve = []
    for bulk_network_port_data in bulk_network_port_datas:
        if (
            "src_hostname" not in bulk_network_port_data
            or not bulk_network_port_data["src_hostname"]
        ):
            failure_message = (
                Status.IMPORT_ERROR.value
                + "Field 'src_hostname' is required for all network imports."
            )
            return JsonResponse(
                {"failure_message": failure_message}, status=HTTPStatus.BAD_REQUEST
            )
        if (
            "src_port" not in bulk_network_port_data
            or not bulk_network_port_data["src_port"]
        ):
            failure_message = (
                Status.IMPORT_ERROR.value
                + "Field 'src_port' is required for all network imports."
            )
            return JsonResponse(
                {"failure_message": failure_message}, status=HTTPStatus.BAD_REQUEST
            )
        try:
            source_asset = Asset.objects.get(
                hostname=bulk_network_port_data["src_hostname"]
            )
        except ObjectDoesNotExist:
            failure_message = (
                Status.IMPORT_ERROR.value
                + "Source asset '"
                + bulk_network_port_data["src_hostname"]
                + "' does not exist. "
            )
            return JsonResponse(
                {"failure_message": failure_message}, status=HTTPStatus.BAD_REQUEST
            )
        try:
            validate_user_permission_on_existing_asset(request.user, source_asset)
        except UserAssetPermissionException as auth_error:
            return JsonResponse(
                {"failure_message": Status.AUTH_ERROR.value + str(auth_error)},
                status=HTTPStatus.UNAUTHORIZED,
            )
        try:
            existing_port = NetworkPort.objects.get(
                asset=source_asset, port_name=bulk_network_port_data["src_port"]
            )
        except ObjectDoesNotExist:
            failure_message = (
                Status.IMPORT_ERROR.value
                + "Source port '"
                + bulk_network_port_data["src_port"]
                + "' does not exist on asset '"
                + bulk_network_port_data["src_hostname"]
                + "'. "
            )
            return JsonResponse(
                {"failure_message": failure_message}, status=HTTPStatus.BAD_REQUEST
            )
        existing_port_serializer = BulkNetworkPortSerializer(existing_port)
        if records_are_identical(bulk_network_port_data, existing_port_serializer.data):
            num_ports_ignored += 1
        else:
            modifications_to_approve.append(
                {
                    "existing": existing_port_serializer.data,
                    "modified": bulk_network_port_data,
                }
            )
    # all network connections are modifications,
    # because bulk import can't be used to create new ports
    response = {
        "added": 0,
        "ignored": num_ports_ignored,
        "modifications": modifications_to_approve,
    }
    log_bulk_upload(
        request.user,
        ElementType.NETWORK_CONNECTIONS,
        0,
        num_ports_ignored,
        len(modifications_to_approve),
    )
    return JsonResponse(response, status=HTTPStatus.OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def network_bulk_approve(request):
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
    network_datas = data["approved_modifications"]
    warning_message = ""
    for network_data in network_datas:
        source_asset = Asset.objects.get(hostname=network_data["src_hostname"])
        source_asset_data = RecursiveAssetSerializer(source_asset).data
        mac_address, network_connection = normalize_bulk_network_data(network_data)
        source_asset_data["mac_addresses"] = mac_address
        source_asset_data["network_connections"] = network_connection
        try:
            save_mac_addresses(asset_data=source_asset_data, asset_id=source_asset.id)
        except MacAddressException as error:
            warning_message += "Some mac addresses couldn't be saved. " + str(error)
        try:
            save_network_connections(
                asset_data=source_asset_data, asset_id=source_asset.id
            )
        except NetworkConnectionException as error:
            warning_message += "Some network connections couldn't be saved. " + str(
                error
            )
    log_bulk_approve(request.user, ElementType.NETWORK_CONNECTIONS, len(network_datas))
    if warning_message:
        return JsonResponse({"warning_message": warning_message}, status=HTTPStatus.OK,)
    else:
        return JsonResponse(
            {"success_message": "All network connections created succesfully."},
            status=HTTPStatus.OK,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def network_bulk_export(request):
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
    all_ports = []
    for asset in assets:
        ports = NetworkPort.objects.filter(asset=asset)
        for port in ports:
            if port.asset.hostname:
                all_ports.append(port)
    serializer = BulkNetworkPortSerializer(all_ports, many=True)
    csv_string = StringIO()
    fields = BulkNetworkPortSerializer.Meta.fields
    csv_writer = csv.DictWriter(csv_string, fields)
    csv_writer.writeheader()
    csv_writer.writerows(serializer.data)
    return JsonResponse({"export_csv": csv_string.getvalue()}, status=HTTPStatus.OK)
