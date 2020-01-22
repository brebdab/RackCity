from django.urls import path
from rackcity.api import views

urlpatterns = [
    path('models/', views.model_list),
    path('models/<int:pk>/', views.model_detail),
]