---
layout: ~/layouts/Main.astro
title: Deploy a Website
---

The following guides are based on some shared assumptions:

- You are using the default build output location (`dist/`). This location [can be changed using the `dist` configuration option](/reference/configuration-reference).
- You are using npm. You can use equivalent commands to run the scripts if you are using Yarn or other package managers.
- Astro is installed as a local dev dependency in your project, and you have setup the following npm scripts:

```json
{
  "scripts": {
    "start": "astro dev",
    "build": "astro build"
  }
}
```

## Building The App

You may run `npm run build` command to build the app.

```bash
$ npm run build
```

By default, the build output will be placed at `dist/`. You may deploy this `dist/` folder to any of your preferred platforms.

## GitHub Pages

1. Set the correct `buildOptions.site` in `astro.config.js`.
2. Run `touch public/.nojekyll` to create a `.nojekyll` file in `public/`. This [bypasses GitHub Page's default behavior](https://github.blog/2009-12-29-bypassing-jekyll-on-github-pages/) to ignore paths prefixed with `_`.
3. Inside your project, create `deploy.sh` with the following content (uncommenting the appropriate lines), and run it to deploy:

   ```bash{13,20,23}
   #!/usr/bin/env sh

   # abort on errors
   set -e

   # build
   npm run build

   # navigate into the build output directory
   cd dist

   # if you are deploying to a custom domain
   # echo 'www.example.com' > CNAME

   git init
   git add -A
   git commit -m 'deploy'

   # if you are deploying to https://<USERNAME>.github.io
   # git push -f git@github.com:<USERNAME>/<USERNAME>.github.io.git main

   # if you are deploying to https://<USERNAME>.github.io/<REPO>
   # git push -f git@github.com:<USERNAME>/<REPO>.git main:gh-pages

   cd -
   ```

   > You can also run the above script in your CI setup to enable automatic deployment on each push.

### GitHub Actions

TODO: We'd love an example action snippet to share here!

### Travis CI

1. Set the correct `buildOptions.site` in `astro.config.js`.
2. Create a file named `.travis.yml` in the root of your project.
3. Run `npm install` locally and commit the generated lockfile (`package-lock.json`).
4. Use the GitHub Pages deploy provider template, and follow the [Travis CI documentation](https://docs.travis-ci.com/user/deployment/pages/).

   ```yaml
   language: node_js
   node_js:
     - lts/*
   install:
     - npm ci
   script:
     - npm run build
   deploy:
     provider: pages
     skip_cleanup: true
     local_dir: dist
     # A token generated on GitHub allowing Travis to push code on you repository.
     # Set in the Travis settings page of your repository, as a secure variable.
     github_token: $GITHUB_TOKEN
     keep_history: true
     on:
       branch: master
   ```

## GitLab Pages

1. Set the correct `buildOptions.site` in `astro.config.js`.
2. Set `build.outDir` in `astro.config.js` to `public`.
3. Create a file called `.gitlab-ci.yml` in the root of your project with the content below. This will build and deploy your site whenever you make changes to your content:

   ```yaml
   image: node:10.22.0
   pages:
     cache:
       paths:
         - node_modules/
     script:
       - npm install
       - npm run build
     artifacts:
       paths:
         - public
     only:
       - master
   ```

## Netlify

In your codebase, make sure you have a `.nvmrc` file with `v14.15.1` in it.

You can configure your deploy in two ways, via the Netlify website or with the `netlify.toml` file.

With the `netlify.toml` file, add it at the top level of your project with the following settings:

```toml
[build]
  command = "npm run build"
  publish = "dist"
```

Then, set up a new project on [Netlify](https://netlify.com) from your chosen Git provider.

If you don't want to use the `netlify.toml`, when you go to [Netlify](https://netlify.com) and set up up a new project from Git, input the following settings:

- **Build Command:** `astro build` or `npm run build`
- **Publish directory:** `dist`

Then hit the deploy button.

## Google Firebase

1. Make sure you have [firebase-tools](https://www.npmjs.com/package/firebase-tools) installed.

2. Create `firebase.json` and `.firebaserc` at the root of your project with the following content:

   `firebase.json`:

   ```json
   {
     "hosting": {
       "public": "dist",
       "ignore": []
     }
   }
   ```

   `.firebaserc`:

   ```js
   {
    "projects": {
      "default": "<YOUR_FIREBASE_ID>"
    }
   }
   ```

3. After running `npm run build`, deploy using the command `firebase deploy`.

## Surge

1. First install [surge](https://www.npmjs.com/package/surge), if you haven’t already.

2. Run `npm run build`.

3. Deploy to surge by typing `surge dist`.

You can also deploy to a [custom domain](http://surge.sh/help/adding-a-custom-domain) by adding `surge dist yourdomain.com`.

## Heroku

1. Install [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli).

2. Create a Heroku account by [signing up](https://signup.heroku.com).

3. Run `heroku login` and fill in your Heroku credentials:

   ```bash
   $ heroku login
   ```

4. Create a file called `static.json` in the root of your project with the below content:

   `static.json`:

   ```json
   {
     "root": "./dist"
   }
   ```

   This is the configuration of your site; read more at [heroku-buildpack-static](https://github.com/heroku/heroku-buildpack-static).

5. Set up your Heroku git remote:

   ```bash
   # version change
   $ git init
   $ git add .
   $ git commit -m "My site ready for deployment."

   # creates a new app with a specified name
   $ heroku apps:create example

   # set buildpack for static sites
   $ heroku buildpacks:set https://github.com/heroku/heroku-buildpack-static.git
   ```

6. Deploy your site:

   ```bash
   # publish site
   $ git push heroku master

   # opens a browser to view the Dashboard version of Heroku CI
   $ heroku open
   ```

## Vercel

To deploy your Astro project with a [Vercel for Git](https://vercel.com/docs/git), make sure it has been pushed to a Git repository.

Go to https://vercel.com/import/git and import the project into Vercel using your Git of choice (GitHub, GitLab or BitBucket). Follow the wizard to select the project root with the project's `package.json` and override the build step using `npm run build` and the output dir to be `./dist`

After your project has been imported, all subsequent pushes to branches will generate Preview Deployments, and all changes made to the Production Branch (commonly "main") will result in a Production Deployment.

Once deployed, you will get a URL to see your app live, such as the following: https://astro.vercel.app

## Azure Static Web Apps

You can deploy your Astro project with Microsoft Azure [Static Web Apps](https://aka.ms/staticwebapps) service. You need:

- An Azure account and a subscription key. You can create a [free Azure account here](https://azure.microsoft.com/free).
- Your app code pushed to [GitHub](https://github.com).
- The [SWA Extension](https://marketplace.visualstudio.com/items?itemName=ms-azuretools.vscode-azurestaticwebapps) in [Visual Studio Code](https://code.visualstudio.com).

Install the extension in VS Code and navigate to your app root. Open the Static Web Apps extension, sign in to Azure, and click the '+' sign to create a new Static Web App. You will be prompted to designate which subscription key to use.

Follow the wizard started by the extension to give your app a name, choose a framework preset, and designate the app root (usually `/`) and built file location `/dist`. The wizard will run and will create a GitHub action in your repo in a `.github` folder.

The action will work to deploy your app (watch its progress in your repo's Actions tab) and, when successfully completed, you can view your app in the address provided in the extension's progress window by clicking the 'Browse Website' button that appears when the GitHub action has run.

## Credits

This guide was originally based off of [Vite's](https://vitejs.dev/) well-documented static deploy guide.
