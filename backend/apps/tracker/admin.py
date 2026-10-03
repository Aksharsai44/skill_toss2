from django.contrib import admin

from .models import ActivityEvent, DailyGoal, DailyTask


admin.site.register((DailyGoal, DailyTask, ActivityEvent))
