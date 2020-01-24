# Django + React Introduction



This project is broken up into a backend and frontend. The backend contains the Django project which uses the Django Rest Framework to host a simple API. The frontend uses React and queries data from the API.


## Backend Dev workflow: 

Run the following commands to get started:

```json
source <env dir name>/bin/activate
pip install -r requirements.txt
npm i
npm run build   ## note you need to rerun this step everytime there are changes in the front-end code 
python manage.py runserver #only `http://127.0.0.1:8000` is whitelisted.
```

## Frontend Dev workflow:
I have found that it is easier to dev locally with the following workflow:
First, run your Django project with the above commands.
Then, start a node server with: 
```bash
npm start #only localhost:3000 is whitelisted 
```

## Corsheader issues for Local dev

There are certain domains that are whitelisted under CORS_ORIGIN_WHITELIST in `settings.py`. If you are running code locally from any address that is not included in this, you will have to add it to this section. 

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
