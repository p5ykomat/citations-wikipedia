# Toolforge deployment

The application serves static files with Node.js 22. Searches run in the visitor's browser against public Wikimedia APIs. No API key or environment secret is required.

Create the tool account and its public GitLab repository first. The suggested name is `wiki-link-count`, subject to availability. Push the code before building. As the tool account, run:

```sh
toolforge build start https://gitlab.wikimedia.org/toolforge-repos/wiki-link-count.git
```

After a successful build:

```sh
toolforge webservice buildservice start --mount=none
```

For updates, push the new code to GitLab, run the build command again, then:

```sh
toolforge webservice buildservice restart --mount=none
```

These updates are manual. A GitHub push alone does not update Toolforge.

Before announcing the deployment, test a real domain search, reference inspection, CSV export, and language switching on the public site. Confirm that the personal-project credit links to Meta and that the blue theme appears immediately.
