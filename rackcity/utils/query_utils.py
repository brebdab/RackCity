from rackcity.api.objects import RackRangeSerializer


def get_sort_arguments(data):
    sort_args = []
    if 'sort_by' in data:
        sort_by = data['sort_by']
        for sort in sort_by:
            if ('field' not in sort) or ('ascending' not in sort):
                raise Exception("Must specify 'field' and 'ascending' fields.")
            if not isinstance(sort['field'], str):
                raise Exception("Field 'field' must be of type string.")
            if not isinstance(sort['ascending'], bool):
                raise Exception("Field 'ascending' must be of type bool.")
            field_name = sort['field']
            order = "-" if not sort['ascending'] else ""
            sort_args.append(order + field_name)
    return sort_args


def get_filter_arguments(data):
    filter_args = []
    if 'filters' in data:
        filters = data['filters']
        for filter in filters:

            if (
                ('field' not in filter)
                or ('filter_type' not in filter)
                or ('filter' not in filter)
            ):
                raise Exception(
                    "Must specify 'field', 'filter_type', and 'filter' fields."
                )
            if not isinstance(filter['field'], str):
                raise Exception("Field 'field' must be of type string.")
            if not isinstance(filter['filter_type'], str):
                raise Exception("Field 'filter_type' must be of type string.")
            if not isinstance(filter['filter'], dict):
                raise Exception("Field 'filter' must be of type dict.")

            filter_field = filter['field']
            filter_type = filter['filter_type']
            filter_dict = filter['filter']

            if filter_type == 'text':
                if filter_dict['match_type'] == 'exact':
                    filter_args.append(
                        {
                            '{0}__iexact'.format(filter_field): filter_dict['value']
                        }
                    )
                elif filter_dict['match_type'] == 'contains':
                    filter_args.append(
                        {
                            '{0}__icontains'.format(filter_field):
                            filter_dict['value']
                        }
                    )

            elif filter_type == 'numeric':
                if (
                    filter_dict['min'] is not None
                    and isinstance(filter_dict['min'], int)
                    and (
                        filter_dict['max'] is None
                        or filter_dict['max'] == ""
                    )
                ):
                    filter_args.append(
                        {
                            '{0}__gte'.format(filter_field): int(filter_dict['min'])  # noqa greater than or equal to min
                        }
                    )
                elif (
                    filter_dict['max'] is not None
                    and isinstance(filter_dict['max'], int)
                    and (
                        filter_dict['min'] is None
                        or filter_dict['min'] == ""
                    )
                ):
                    filter_args.append(
                        {
                            '{0}__lte'.format(filter_field): int(filter_dict['max'])  # noqa less than or equal to max
                        }
                    )
                elif (
                    int(filter_dict['max']) is not None
                    and int(filter_dict['min']) is not None
                ):
                    range_value = (
                        int(filter_dict['min']),
                        int(filter_dict['max'])
                    )
                    filter_args.append(
                        {
                            '{0}__range'.format(filter_field): range_value  # noqa inclusive on both min, max
                        }
                    )
                else:
                    raise Exception(
                        "Numeric filters must contain integer min, integer max, or both."
                    )

            elif filter_type == 'rack_range':
                range_serializer = RackRangeSerializer(data=filter_dict)
                if not range_serializer.is_valid():
                    raise Exception(
                        "Invalid rack_range filter: " +
                        str(range_serializer.errors)
                    )
                filter_args.append(
                    {
                        'rack__rack_num__range':
                        range_serializer.get_number_range()
                    }
                )
                filter_args.append(
                    {
                        'rack__row_letter__range':
                        range_serializer.get_row_range()  # noqa inclusive on both letter, number
                    }
                )

            else:
                raise Exception(
                    "String field 'filter_type' must be either 'text', " +
                    "'numeric', or 'rack_range'."
                )

    return filter_args
