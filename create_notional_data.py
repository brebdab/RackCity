from rackcity.models import ITInstance, ITModel, Rack
# from snippets.serializers import SnippetSerializer
# from rest_framework.renderers import JSONRenderer
# from rest_framework.parsers import JSONParser

rack_A1 = Rack(row_letter='A', rack_num=1, height=42)
rack_A1.save()

rack_A2 = Rack(row_letter='A', rack_num=2, height=42)
rack_A2.save()

rack_B1 = Rack(row_letter='B', rack_num=1, height=42)
rack_B1.save()

rack_B2 = Rack(row_letter='B', rack_num=2, height=42)
rack_B2.save()

model_1 = ITModel(
    vendor='Dell',
    model_number='R170',
    height=4,
    display_color='#00009c',
    num_ethernet_ports=2,
    num_power_ports=1,
    cpu='Intel Xeon E5520 2.2GHz',
    memory_gb=10,
    storage='2x500GB SSD RAID1',
    comment='Retired offering, no new purchasing',
)
model_1.save()

model_2 = ITModel(
    vendor='Brebdab',
    model_number='C980',
    height=3,
    display_color='#000000',
    num_ethernet_ports=2,
    num_power_ports=1,
    cpu='Intel Xeon E5520 2.2GHz',
)
model_2.save()

model_3 = ITModel(
    vendor='Juulia',
    model_number='AB568',
    height=3,
    num_ethernet_ports=3,
    comment='Newest model',
)
model_3.save()

instance = ITInstance(
    hostname='server9',
    height=5,
    model=model_1,
    rack=rack_A1,
    owner='bauriemma',
    comment='Reserved for Palaemon project',
)
instance.save()

instance = ITInstance(
    hostname='server9',
    height=5,
    model=model_2,
    rack=rack_A1,
    owner='julias',
)
instance.save()

instance = ITInstance(
    hostname='server9',
    height=5,
    model=model_3,
    rack=rack_B2,
    owner='bauriemma',
    comment='Reserved for Palaemon project',
)
instance.save()

instance = ITInstance(
    hostname='server9',
    height=5,
    model=model_3,
    rack=rack_A2,
    owner='julias',
    comment='Reserved for Palaemon project',
)
instance.save()
