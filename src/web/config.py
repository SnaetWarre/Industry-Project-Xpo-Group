Config.py

"""
Configuration file for the XPO Assistant chatbot.
Defines the available websites and their properties.
"""

WEBSITES = {
    'ffd': {
        'name': 'Flanders Flooring Days',
        'container': 'ffd',
        'theme': 'website1',
        'theme_color': '#8B4513',  # Brown theme
        'description': 'Flanders Flooring Days beurs in Kortrijk Xpo',
        'welcome_message': 'Welkom bij de Flanders Flooring Days assistant! Waar kan ik je mee helpen?'
    },
    'artisan': {
        'name': 'Artisan',
        'container': 'artisan',
        'theme': 'website2',
        'theme_color': '#3E2723',  # Dark chocolate theme
        'description': 'Artisan beurs in Kortrijk Xpo',
        'welcome_message': 'Welkom bij de Artisan assistant! Waar kan ik je mee helpen?'
    },
    'abiss': {
        'name': 'ABISS',
        'container': 'abiss',
        'theme': 'website3',
        'theme_color': '#2E7D32',  # Green theme
        'description': 'ABISS beurs in Kortrijk Xpo',
        'welcome_message': 'Welkom bij de ABISS assistant! Waar kan ik je mee helpen?'
    }
}

# Default website if none specified
DEFAULT_WEBSITE = 'ffd'

# Port configurations
FLASK_PORT = 5001
VECTOR_SERVICE_PORT = 5000 
