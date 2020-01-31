from rackcity.models import ITInstance, ITModel, Rack


def is_location_full(rack_id, instance_elevation, instance_height):
    new_instance_location_range = [
        instance_elevation + i for i in range(instance_height)
    ]
    instances_in_rack = ITInstance.objects.filter(rack=rack_id)
    for instance_in_rack in instances_in_rack:
        for occupied_location in [
            instance_in_rack.elevation + i for i
                in range(instance_in_rack.model.height)
        ]:
            if occupied_location in new_instance_location_range:
                return True
    return False


def records_are_identical(existing_data, new_data):
    existing_keys = existing_data.keys()
    new_keys = new_data.keys()
    for key in existing_keys:
        if (
            key not in new_keys
            and existing_data[key] is not None
            and key != 'id'
        ):
            return False
        if (
            key in new_keys
            and new_data[key] != existing_data[key]
        ):
            if not (
                isinstance(existing_data[key], int)
                and int(new_data[key]) == existing_data[key]
            ):
                return False
    return True
