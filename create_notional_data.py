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

rack_C1 = Rack(row_letter='C', rack_num=1)
rack_C1.save()

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
    elevation=5,
    model=ITModel.objects.all()[0],
    rack=Rack.objects.all()[0],
    owner='bauriemma',
    comment='Reserved for Palaemon project',
)
instance.save()

instance = ITInstance(
    hostname='kali4',
    elevation=30,
    model=ITModel.objects.all()[1],
    rack=Rack.objects.all()[0],
    owner='julias',
    comment='Best server ever',
)
instance.save()

instance = ITInstance(
    hostname='vcm78',
    elevation=5,
    model=ITModel.objects.all()[2],
    rack=Rack.objects.all()[1],
    owner='bauriemma',
)
instance.save()

instance = ITInstance(
    hostname='server0',
    elevation=3,
    model=ITModel.objects.all()[0],
    rack=Rack.objects.all()[3],
    owner='julias',
)
instance.save()


print('Racks:')
print(Rack.objects.all())

print('Models:')
print(ITModel.objects.all())

print('Instances:')
print(ITInstance.objects.all())
