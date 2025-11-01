import multiprocessing

# Gunicorn configuration file for production
workers = (multiprocessing.cpu_count() * 2) + 1
bind = "0.0.0.0:8000"
timeout = 120
keepalive = 5
accesslog = "-"  # stdout
errorlog = "-"   # stderr
loglevel = "info"

# You can tune worker_class if you use async libraries
# worker_class = 'gthread'
