# Cork Labs Bot

> Simple API and tools to manage packages on Cork Labs CI server.


## Setup

```
$ export NODE_ENV=<environment>; node setup.js
```

## Command line

### Creating a project

```
$ node bin/create-project.js -id:nglib-boilerplate -status:published -name:Nglib\ Boilerplate -path:/servers/andre/az/cork-store/projects/ -repo:git@github.com:cork-labs/nglib-boilerplate.git
```

### Deleting a project

```
$ node bin/delete-project.js -id:nglib-boilerplate
```

### Adding a version

```
$ node bin/add-project-version.js -id:nglib-boilerplate -version:0.0.1 -docsUrl://docs.cork-labs.org/nglib-boilerplate/0.0.1
```

### Deleting a version

```
$ node bin/delete-project-version.js -id:nglib-boilerplate -version:0.0.1
```

## API

```
$ export NODE_ENV=<environment> PORT=3002; node server.js
```

All data served by the API is wrapped in a ```data``` property.

Some responses also include ```meta```.

Requests that result in an error contain an ```error:``` property with the details.

```
{
    data: {...}, // the requested resource
    meta: {...}, // ex: pagination
    error: {...} //
}
```

### Resource: __Project__

#### GET /project List projects

```
//<domain>:<port>/project
```

```
{
    "data": [{
        "id": "cork-labs.bot.bk",
        "name": "Cork Labs Bot",
        "versions": []
    },{
        "id": "nglib-boilerplate",
        "name": "Nglib Boilerplate",
        "versions": [{
            "version": "0.0.1",
            "docsUrl": "//docs.cork-labs.org/nglib-boilerplate/0.0.1",
            "date": "2014-12-19T02:14:36.095Z"
        }]
    }],
    "meta": {
        "pagination": {
            "page": 1,
            "limit": 30,
            "total": 2
        }
    }
}
```

#### GET /project/:id Project details

```
//<domain>:<port>/project/:id
```

```
{
    "data": {
        "id": "nglib-boilerplate",
        "name": "Nglib Boilerplate",
        "versions": [{
            "version": "0.0.1",
            "docsUrl": "//docs.cork-labs.org/nglib-boilerplate/0.0.1",
            "date": "2014-12-19T02:14:36.095Z"
        }]
    }
}
```

#### GET /project/:id Project versions

```
//<domain>:<port>/project/:id/versions
```

Returns a raw list of versions ordered by creation date.

This method is mainly for consumption by [ngdocs](//).

```
[{
    "version":"0.0.1",
    "url":"//docs.cork-labs.org/nglib-boilerplate/0.0.1"
},{
    "version":"0.0.1",
    "url":"//docs.cork-labs.org/nglib-boilerplate/0.0.2"
}]
```

