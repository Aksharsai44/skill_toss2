from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("apps.accounts.urls")),
    path("api/", include("apps.accounts.user_urls")),
    path("api/", include("apps.academics.urls")),
    path("api/", include("apps.learning.urls")),
    path("api/", include("apps.tracker.urls")),
    path("api/", include("apps.resources.urls")),
]
