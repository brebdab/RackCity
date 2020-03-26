from django.db.models import Q
from rackcity.models import Asset, AssetCP
from django.db.models.signals import post_save
from django.dispatch import receiver


def get_assets_for_cp(change_plan=None):
    """
    If a change plan is specified, returns Asset query and AssetCP query,
    where any assets modified in the change plan are in the AssetCP query but
    removed from the Asset query. If no change plan is specified, returns
    Asset query of all assets on master.
    """
    assets = Asset.objects.all()
    if change_plan is None:
        return (assets, None)
    assetsCP = AssetCP.objects.filter(change_plan=change_plan)
    for assetCP in assetsCP:
        if (assetCP.related_asset) and (assetCP.related_asset) in assets:
            assets = assets.filter(~Q(id=assetCP.related_asset.id))
    # TODO remove any Asset or AssetCP that has been decommissioned in this CP
    return (assets, assetsCP)


@receiver(post_save, sender=Asset)
def create_asset_cp(sender, **kwargs):
    #fields: sender, instance, created, raw, using, update_fields
    ## asset is a related asset of assetCP
    instance = kwargs.get("instance")
    related_assets_cp = AssetCP.objects.filter(related_asset=instance.id)
    for related_asset in related_assets_cp:
        related_asset.is_conflict = True
        related_asset.save(updated_fields=['is_conflict'])

    ## asset rack location conflicts with an assetCP