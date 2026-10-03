from django.db import migrations


FORWARD_SQL = r"""
CREATE OR REPLACE FUNCTION tracker_validate_owner_and_state()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  goal_id_value uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM accounts_user student
    WHERE student.id = NEW.student_id
      AND student.role = 'student'
      AND student.is_active
      AND student.institution_id = NEW.institution_id
  ) THEN
    RAISE EXCEPTION 'tracker owner must be an active student in the same institution' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'UPDATE' AND (
    NEW.id <> OLD.id OR NEW.student_id <> OLD.student_id OR NEW.institution_id <> OLD.institution_id
  ) THEN
    RAISE EXCEPTION 'tracker ownership is immutable' USING ERRCODE = '23514';
  END IF;
  IF TG_TABLE_NAME = 'tracker_dailytask' THEN
    goal_id_value := NULLIF(to_jsonb(NEW) ->> 'goal_id', '')::uuid;
    IF goal_id_value IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM tracker_dailygoal goal
      WHERE goal.id = goal_id_value
        AND goal.student_id = NEW.student_id
        AND goal.institution_id = NEW.institution_id
    ) THEN
      RAISE EXCEPTION 'task goal must belong to the same student' USING ERRCODE = '23514';
    END IF;
  END IF;
  IF NEW.status = 'completed' AND NEW.completed_at IS NULL THEN
    NEW.completed_at := statement_timestamp();
  ELSIF NEW.status <> 'completed' THEN
    NEW.completed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION tracker_record_activity()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  next_event text;
  next_goal_id uuid;
  next_task_id uuid;
BEGIN
  IF TG_TABLE_NAME = 'tracker_dailygoal' THEN
    IF TG_OP = 'INSERT' THEN next_event := 'goal_created';
    ELSIF NEW.status = 'completed' AND OLD.status <> 'completed' THEN next_event := 'goal_completed';
    END IF;
    next_goal_id := NEW.id;
  ELSE
    IF TG_OP = 'INSERT' THEN next_event := 'task_created';
    ELSIF NEW.status = 'completed' AND OLD.status <> 'completed' THEN next_event := 'task_completed';
    END IF;
    next_goal_id := NULLIF(to_jsonb(NEW) ->> 'goal_id', '')::uuid;
    next_task_id := NEW.id;
  END IF;
  IF next_event IS NOT NULL THEN
    INSERT INTO tracker_activityevent (
      id, institution_id, student_id, event_type, goal_id, task_id, occurred_at
    ) VALUES (
      gen_random_uuid(), NEW.institution_id, NEW.student_id, next_event,
      next_goal_id, next_task_id, statement_timestamp()
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION tracker_protect_activity_history()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' AND pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'activity history is system generated and immutable' USING ERRCODE = '42501';
END;
$$;

CREATE TRIGGER tracker_goal_validate
BEFORE INSERT OR UPDATE ON tracker_dailygoal
FOR EACH ROW EXECUTE FUNCTION tracker_validate_owner_and_state();
CREATE TRIGGER tracker_task_validate
BEFORE INSERT OR UPDATE ON tracker_dailytask
FOR EACH ROW EXECUTE FUNCTION tracker_validate_owner_and_state();
CREATE TRIGGER tracker_goal_activity
AFTER INSERT OR UPDATE ON tracker_dailygoal
FOR EACH ROW EXECUTE FUNCTION tracker_record_activity();
CREATE TRIGGER tracker_task_activity
AFTER INSERT OR UPDATE ON tracker_dailytask
FOR EACH ROW EXECUTE FUNCTION tracker_record_activity();
CREATE TRIGGER tracker_activity_immutable
BEFORE INSERT OR UPDATE OR DELETE ON tracker_activityevent
FOR EACH ROW EXECUTE FUNCTION tracker_protect_activity_history();

REVOKE ALL ON FUNCTION tracker_validate_owner_and_state() FROM PUBLIC;
REVOKE ALL ON FUNCTION tracker_record_activity() FROM PUBLIC;
REVOKE ALL ON FUNCTION tracker_protect_activity_history() FROM PUBLIC;
"""


REVERSE_SQL = r"""
DROP TRIGGER IF EXISTS tracker_activity_immutable ON tracker_activityevent;
DROP TRIGGER IF EXISTS tracker_task_activity ON tracker_dailytask;
DROP TRIGGER IF EXISTS tracker_goal_activity ON tracker_dailygoal;
DROP TRIGGER IF EXISTS tracker_task_validate ON tracker_dailytask;
DROP TRIGGER IF EXISTS tracker_goal_validate ON tracker_dailygoal;
DROP FUNCTION IF EXISTS tracker_protect_activity_history();
DROP FUNCTION IF EXISTS tracker_record_activity();
DROP FUNCTION IF EXISTS tracker_validate_owner_and_state();
"""


class Migration(migrations.Migration):
    dependencies = [("tracker", "0001_initial")]

    operations = [migrations.RunSQL(FORWARD_SQL, reverse_sql=REVERSE_SQL)]
