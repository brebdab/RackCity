# Django + React Introduction

[![alt text](https://github.com/justdjango/DjReact/blob/master/thumbnail.png "Logo")](https://youtu.be/uZgRbnIsgrA)

This project is broken up into a backend and frontend. The backend contains the Django project which uses the Django Rest Framework to host a simple API. The frontend uses React and queries data from the API.

Run the following commands to get started:

```json
virtualenv env # OR: source <env dir name>/bin/activate
pip install -r requirements.txt
npm i
npm run build
python manage.py runserver
```

### Testing on Postman with auth!
Run the server as above and navigate to http://127.0.0.1:8000/rest-auth/login/
Login (slack Ben or Julia if you don't know how)
It should reply with your auth token--copy that
In Postman, go to the request's Headers, and add this:
```
Authorization: Token <your token>
```
Make sure the check box next to that part of the header is checked
Voila!

To navigate back to the starting code of [video 2](https://www.youtube.com/watch?v=w-QJiQwlZzU&t=4s):

```json
git init
git clone https://github.com/justdjango/DjReact.git
cd DjReact
git reset --hard 815eb83e0894d9bc5ebef66501721dc5063cf6a0
```

For [video 3](https://www.youtube.com/watch?v=BxzO2M7QcZw):

```json
git reset --hard 3030f494a799e5b7996342e5176f7c604dcf868b
```

Remove the git repo with this command on mac/linux:

```json
rm -rf .git
```

and this on windows:

```json
rmdir .git
```
## Migrations

Whenever any changes are made to the Django models, these changes are not automatically applied to the app's database. These changes must be applied via migrations.

In order to reflect model changes in a new migration, run: 
```json
python manage.py makemigrations
```

Once these migrations are created, apply them to the database with: 
```json
python manage.py migrate
```

You can also view all previous migrations with: 
```json
python manage.py showmigrations
```
