from rackcity.models import ITInstance, ITModel, Rack


def is_location_full(
    rack_id,
    instance_elevation,
    instance_height,
    instance_id=None,
):
    new_instance_location_range = [
        instance_elevation + i for i in range(instance_height)
    ]
    instances_in_rack = ITInstance.objects.filter(rack=rack_id)
    for instance_in_rack in instances_in_rack:
        # Ignore if instance being modified conflicts with its old location
        if (instance_id is None or instance_in_rack.id != instance_id):
            for occupied_location in [
                instance_in_rack.elevation + i for i
                    in range(instance_in_rack.model.height)
            ]:
                if occupied_location in new_instance_location_range:
                    return True
    return False


def validate_location_modification(data, existing_instance):
    instance_id = existing_instance.id
    rack_id = existing_instance.rack.id
    instance_elevation = existing_instance.elevation
    instance_height = existing_instance.model.height

    if 'elevation' in data:
        try:
            instance_elevation = int(data['elevation'])
        except ValueError:
            raise Exception("Field 'elevation' must be of type int.")

    if 'model' in data:
        try:
            instance_height = ITModel.objects.get(id=data['model']).height
        except Exception:
            raise Exception("No existing model with id=" +
                            str(data['model']) + ".")

    if 'rack' in data:
        try:
            rack_id = Rack.objects.get(id=data['rack']).id
        except Exception:
            raise Exception("No existing rack with id=" +
                            str(data['rack']) + ".")

    if is_location_full(
        rack_id,
        instance_elevation,
        instance_height,
        instance_id=instance_id,
    ):
        raise Exception("Instance does not fit in modified location.")


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


def no_infile_location_conflicts(instance_datas):
    location_occupied_by = {}
    for instance_data in instance_datas:
        rack = instance_data['rack']
        height = ITModel.objects.get(id=instance_data['model']).height
        elevation = instance_data['elevation']
        instance_location_range = [  # THIS IS REPEATED! FACTOR OUT.
            elevation + i for i in range(height)
        ]
        if rack not in location_occupied_by:
            location_occupied_by[rack] = {}
        for location in instance_location_range:
            if location_occupied_by[rack][location]:
                raise Exception(
                    "Instance '" +
                    instance_data['hostname'] +
                    "' conflicts with instance '" +
                    location_occupied_by[rack][location] +
                    "'. ")
            else:
                location_occupied_by[rack][location] = instance_data['hostname']
    return
