from celery import shared_task
from django.core.management import call_command


@shared_task
def example_task():
    """
    Example Celery task.
    """
    return 'Task completed successfully'


@shared_task
def run_tenxyte_cleanup():
    """
    Periodic task: runs tenxyte_cleanup management command.
    Scheduled daily at 03:00 UTC via Celery Beat.
    """
    call_command('tenxyte_cleanup')
