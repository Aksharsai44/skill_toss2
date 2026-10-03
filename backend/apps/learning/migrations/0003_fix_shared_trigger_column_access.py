from django.db import migrations


FORWARD_SQL = r"""
CREATE OR REPLACE FUNCTION learning_validate_session_or_assignment()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  target_batch academics_batch%ROWTYPE;
BEGIN
  SELECT * INTO target_batch FROM academics_batch WHERE id = NEW.batch_id;
  IF target_batch.id IS NULL OR target_batch.institution_id <> NEW.institution_id OR target_batch.status <> 'active' THEN
    RAISE EXCEPTION 'learning record requires an active batch in the same institution' USING ERRCODE = '23514';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM academics_subject subject
    WHERE subject.id = NEW.subject_id
      AND subject.institution_id = NEW.institution_id
      AND subject.course_id = target_batch.course_id
      AND subject.is_active
  ) THEN
    RAISE EXCEPTION 'subject must be active and belong to the batch course' USING ERRCODE = '23514';
  END IF;
  IF NOT learning_staff_can_manage_batch(NEW.created_by_id, NEW.batch_id) THEN
    RAISE EXCEPTION 'creator is not allowed to manage this batch' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'UPDATE' AND (
    NEW.institution_id <> OLD.institution_id
    OR NEW.batch_id <> OLD.batch_id
    OR NEW.subject_id <> OLD.subject_id
    OR NEW.created_by_id <> OLD.created_by_id
  ) THEN
    RAISE EXCEPTION 'learning record identity fields are immutable' USING ERRCODE = '23514';
  END IF;
  IF TG_TABLE_NAME = 'learning_attendancesession' AND TG_OP = 'UPDATE'
     AND (to_jsonb(NEW) ->> 'attendance_date') IS DISTINCT FROM (to_jsonb(OLD) ->> 'attendance_date') THEN
    RAISE EXCEPTION 'attendance date is immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION learning_validate_session_or_assignment() FROM PUBLIC;
"""


REVERSE_SQL = r"""
CREATE OR REPLACE FUNCTION learning_validate_session_or_assignment()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  target_batch academics_batch%ROWTYPE;
BEGIN
  SELECT * INTO target_batch FROM academics_batch WHERE id = NEW.batch_id;
  IF target_batch.id IS NULL OR target_batch.institution_id <> NEW.institution_id OR target_batch.status <> 'active' THEN
    RAISE EXCEPTION 'learning record requires an active batch in the same institution' USING ERRCODE = '23514';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM academics_subject subject
    WHERE subject.id = NEW.subject_id
      AND subject.institution_id = NEW.institution_id
      AND subject.course_id = target_batch.course_id
      AND subject.is_active
  ) THEN
    RAISE EXCEPTION 'subject must be active and belong to the batch course' USING ERRCODE = '23514';
  END IF;
  IF NOT learning_staff_can_manage_batch(NEW.created_by_id, NEW.batch_id) THEN
    RAISE EXCEPTION 'creator is not allowed to manage this batch' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'UPDATE' AND (
    NEW.institution_id <> OLD.institution_id
    OR NEW.batch_id <> OLD.batch_id
    OR NEW.subject_id <> OLD.subject_id
    OR NEW.created_by_id <> OLD.created_by_id
  ) THEN
    RAISE EXCEPTION 'learning record identity fields are immutable' USING ERRCODE = '23514';
  END IF;
  IF TG_TABLE_NAME = 'learning_attendancesession' AND TG_OP = 'UPDATE'
     AND NEW.attendance_date <> OLD.attendance_date THEN
    RAISE EXCEPTION 'attendance date is immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
"""


class Migration(migrations.Migration):
    dependencies = [("learning", "0002_learning_integrity_triggers")]

    operations = [migrations.RunSQL(FORWARD_SQL, reverse_sql=REVERSE_SQL)]
