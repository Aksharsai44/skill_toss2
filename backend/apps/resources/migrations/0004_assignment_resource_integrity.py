from django.db import migrations


FORWARD_SQL = r"""
CREATE OR REPLACE FUNCTION resources_validate_assignment_resource()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  target_assignment learning_assignment%ROWTYPE;
BEGIN
  IF position('..' in NEW.file) > 0 OR NEW.file LIKE '/%' THEN
    RAISE EXCEPTION 'unsafe private file path' USING ERRCODE = '23514';
  END IF;
  SELECT * INTO target_assignment FROM learning_assignment WHERE id = NEW.assignment_id;
  IF target_assignment.id IS NULL OR target_assignment.institution_id <> NEW.institution_id THEN
    RAISE EXCEPTION 'assignment resource must share its assignment institution' USING ERRCODE = '23514';
  END IF;
  IF NOT learning_staff_can_manage_batch(NEW.uploaded_by_id, target_assignment.batch_id) THEN
    RAISE EXCEPTION 'uploader cannot manage the assignment batch' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'UPDATE' AND (
    NEW.institution_id <> OLD.institution_id OR NEW.assignment_id <> OLD.assignment_id
    OR NEW.uploaded_by_id <> OLD.uploaded_by_id OR NEW.file <> OLD.file
  ) THEN
    RAISE EXCEPTION 'assignment resource ownership and path are immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER resources_assignment_resource_integrity
BEFORE INSERT OR UPDATE ON resources_assignmentresource
FOR EACH ROW EXECUTE FUNCTION resources_validate_assignment_resource();

REVOKE ALL ON FUNCTION resources_validate_assignment_resource() FROM PUBLIC;
"""


REVERSE_SQL = r"""
DROP TRIGGER IF EXISTS resources_assignment_resource_integrity ON resources_assignmentresource;
DROP FUNCTION IF EXISTS resources_validate_assignment_resource();
"""


class Migration(migrations.Migration):
    dependencies = [("resources", "0003_assignmentresource")]

    operations = [migrations.RunSQL(FORWARD_SQL, reverse_sql=REVERSE_SQL)]
