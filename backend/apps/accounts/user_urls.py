from rest_framework.routers import SimpleRouter

from .views import ManagedUserViewSet


router = SimpleRouter()
router.register("users", ManagedUserViewSet, basename="user-management")

urlpatterns = router.urls
