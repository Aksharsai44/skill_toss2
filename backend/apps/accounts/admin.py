from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import Institution, SecurityAuditEvent, User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    ordering = ("email",)
    list_display = ("email", "full_name", "role", "institution", "is_active", "is_staff")
    list_filter = ("role", "is_active", "is_staff", "institution")
    search_fields = ("email", "full_name")
    readonly_fields = ("auth_version", "provisioning_data", "created_at", "updated_at", "last_login")
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Identity", {"fields": ("full_name", "role", "institution", "avatar_url")}),
        (
            "Status",
            {"fields": ("is_active", "is_staff", "is_superuser", "auth_version", "provisioning_data")},
        ),
        ("Permissions", {"fields": ("groups", "user_permissions")}),
        ("Dates", {"fields": ("last_login", "created_at", "updated_at")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "email",
                    "full_name",
                    "role",
                    "institution",
                    "password1",
                    "password2",
                    "is_active",
                    "is_staff",
                ),
            },
        ),
    )


admin.site.register(Institution)


@admin.register(SecurityAuditEvent)
class SecurityAuditEventAdmin(admin.ModelAdmin):
    list_display = ("action", "actor", "target_user", "timestamp")
    list_filter = ("action",)
    search_fields = ("actor__email", "target_user__email")
    readonly_fields = ("actor", "target_user", "action", "metadata", "timestamp")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
