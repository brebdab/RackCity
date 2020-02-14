from django.core.exceptions import ObjectDoesNotExist
from django.http import HttpResponse, JsonResponse
from rackcity.models import Rack, ITInstance
from rackcity.api.serializers import RackSerializer, ITInstanceSerializer
from rackcity.api.objects import RackRangeSerializer
from rest_framework.decorators import permission_classes, api_view
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from http import HTTPStatus
from rackcity.views.rackcity_utils import get_rack_detailed_response


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def rack_get_all(request):
    """
    List all racks
    """
    racks = Rack.objects.all()
    return get_rack_detailed_response(racks)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def rack_get(request):
    """
    List all racks within specified range.
    """
    range_serializer = RackRangeSerializer(data=request.data)

    if not range_serializer.is_valid():
        return JsonResponse(
            {"failure_message": str(range_serializer.errors)},
            status=HTTPStatus.BAD_REQUEST,
        )

    racks = Rack.objects.filter(  # WILL NEED TO FILTER BY DATACENTER TOO
        rack_num__range=range_serializer.get_number_range(),  # inclusive range
        row_letter__range=range_serializer.get_row_range(),
    )

    return get_rack_detailed_response(racks)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def rack_create(request):
    """
    Create racks within specified range.
    """
    range_serializer = RackRangeSerializer(data=request.data)
    if not range_serializer.is_valid():
        return JsonResponse(
            {"failure_message": str(range_serializer.errors)},
            status=HTTPStatus.BAD_REQUEST,
        )
    racks = Rack.objects.filter(  # WILL NEED TO FILTER ON DATACENTER
        rack_num__range=range_serializer.get_number_range(),  # inclusive range
        row_letter__range=range_serializer.get_row_range(),
    )
    if racks.count() > 0:
        failure_message = "The range of racks " + \
            range_serializer.get_row_range_as_string() + " " + \
            range_serializer.get_number_range_as_string() + \
            " cannot be created because the following racks" + \
            " within this range already exist: "  # ADD DATACENTER TO THIS MESSAGE
        failure_message += ", ".join(
            [str(rack.row_letter) + str(rack.rack_num) for rack in racks]
        )
        return JsonResponse(
            {"failure_message": failure_message},
            status=HTTPStatus.BAD_REQUEST,
        )
    else:
        rack_row_list = range_serializer.get_row_list()
        rack_num_list = range_serializer.get_number_list()
        for row in rack_row_list:
            for num in rack_num_list:
                # ADD DATACENTER HERE
                rack = Rack(row_letter=row, rack_num=num)
                rack.save()
        return HttpResponse(status=HTTPStatus.OK)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def rack_delete(request):
    """
    Delete racks within specified range.
    """
    failure_message = ""
    range_serializer = RackRangeSerializer(data=request.data)
    if not range_serializer.is_valid():
        return JsonResponse(
            {"failure_message": str(range_serializer.errors)},
            status=HTTPStatus.BAD_REQUEST,
        )
    nonexistent_racks = []
    unempty_racks = []
    for row_letter in range_serializer.get_row_list():
        for rack_num in range_serializer.get_number_list():
            try:
                rack = Rack.objects.get(  # ADD DATACENTER
                    row_letter=row_letter,
                    rack_num=rack_num,
                )
            except ObjectDoesNotExist:
                nonexistent_racks.append(row_letter + str(rack_num))
            else:
                if ITInstance.objects.filter(rack=rack.id).count() > 0:
                    unempty_racks.append(row_letter + str(rack_num))
    if len(unempty_racks) > 0:
        failure_message += "The following racks within this" + \
            " range contain instances: " + ", ".join(unempty_racks) + ". "
    if len(nonexistent_racks) > 0:
        failure_message += "The following racks within this" + \
            " range do not exist: " + ", ".join(nonexistent_racks) + ". "
    if failure_message != "":
        failure_message = "The range of racks " + \
            range_serializer.get_row_range_as_string() + " " + \
            range_serializer.get_number_range_as_string() + \
            " cannot be deleted. " + failure_message
        return JsonResponse(
            {"failure_message": failure_message},
            status=HTTPStatus.BAD_REQUEST,
        )
    racks = Rack.objects.filter(  # DATACENTER
        rack_num__range=range_serializer.get_number_range(),  # inclusive range
        row_letter__range=range_serializer.get_row_range(),
    )
    try:
        racks.delete()
    except Exception as error:
        failure_message = str(error)
        return JsonResponse(
            {"failure_message": failure_message},
            status=HTTPStatus.BAD_REQUEST,
        )
    return HttpResponse(status=HTTPStatus.OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def rack_summary(request):
    racks = Rack.objects.all()
    serializer = RackSerializer(racks, many=True)
    return JsonResponse({"racks": serializer.data}, status=HTTPStatus.OK)
