def is_netid_user(user):
    """
    Returns true if user is Duke SSO authenticated NetID user.
    Determined by whether the user has a non-empty password, since
    NetID users are authenticated by access token and their associated
    passwords are empty strings.
    """
    return not user.password
