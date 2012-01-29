from functools import wraps
from flask import request, current_app

def jsonp(fn):
    """Wraps JSONified output for JSONP"""
    @wraps(fn)
    def decorated_function(*args, **kwargs):
        callback = request.args.get('callback', False)
        if callback:
            content = str(callback) + '(' + str(fn(*args,**kwargs).data) + ')'
            return current_app.response_class(
                content, mimetype='application/javascript')
        else:
            return fn(*args, **kwargs)
    return decorated_function

