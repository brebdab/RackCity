from django.urls import path
from rackcity.api import views
# from rackcity.api.views import ArticleViewSet
# from rest_framework.routers import DefaultRouter

# router = DefaultRouter()
# router.register(r'', ArticleViewSet, basename='rackcity')
# urlpatterns = router.urls

urlpatterns = [
    path('models/', views.model_list),
]