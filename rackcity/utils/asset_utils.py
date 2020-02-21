from django.core.exceptions import ObjectDoesNotExist
from rackcity.models import Asset


# def get_asset_number():
#     for asset_number in range(100000, 999999):
#         try:
#             Asset.objects.get(asset_number=asset_number)
#         except ObjectDoesNotExist:
#             return asset_number
