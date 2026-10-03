from rest_framework import serializers

from .models import ActivityEvent, DailyGoal, DailyTask


class RejectProtectedFieldsMixin:
    protected_fields = frozenset()

    def to_internal_value(self, data):
        supplied = sorted(set(data.keys()) & set(self.protected_fields))
        if supplied:
            raise serializers.ValidationError(
                {field: "This field is controlled by the server." for field in supplied}
            )
        return super().to_internal_value(data)


class DailyGoalSerializer(RejectProtectedFieldsMixin, serializers.ModelSerializer):
    institution = serializers.UUIDField(source="institution_id", read_only=True)
    student = serializers.UUIDField(source="student_id", read_only=True)
    protected_fields = {"institution", "institution_id", "student", "student_id", "completed_at"}

    class Meta:
        model = DailyGoal
        fields = (
            "id", "institution", "student", "title", "category", "target", "target_date",
            "status", "completed_at", "created_at", "updated_at",
        )
        read_only_fields = ("id", "institution", "student", "completed_at", "created_at", "updated_at")

    def create(self, validated_data):
        return DailyGoal.objects.create(student=self.context["request"].user, **validated_data)


class DailyTaskSerializer(RejectProtectedFieldsMixin, serializers.ModelSerializer):
    institution = serializers.UUIDField(source="institution_id", read_only=True)
    student = serializers.UUIDField(source="student_id", read_only=True)
    protected_fields = {"institution", "institution_id", "student", "student_id", "completed_at"}

    class Meta:
        model = DailyTask
        fields = (
            "id", "institution", "student", "goal", "activity_date", "title", "status",
            "completed_at", "created_at", "updated_at",
        )
        read_only_fields = ("id", "institution", "student", "completed_at", "created_at", "updated_at")

    def validate_goal(self, goal):
        if goal and goal.student_id != self.context["request"].user.id:
            raise serializers.ValidationError("Goal must belong to the authenticated Student.")
        return goal

    def create(self, validated_data):
        return DailyTask.objects.create(student=self.context["request"].user, **validated_data)


class ActivityEventSerializer(serializers.ModelSerializer):
    institution = serializers.UUIDField(source="institution_id", read_only=True)
    student = serializers.UUIDField(source="student_id", read_only=True)

    class Meta:
        model = ActivityEvent
        fields = ("id", "institution", "student", "event_type", "goal", "task", "occurred_at")
        read_only_fields = fields
