sap.ui.require.preload({
  "edusupport/platform/manifest.json": {
    "_version": "1.59.0",
    "sap.app": {
      "id": "edusupport.platform",
      "type": "application",
      "title": "İSTE Dernek",
      "description": "Eğitim Bağış ve Burs Yönetim Sistemi",
      "applicationVersion": {
        "version": "1.0.0"
      }
    },
    "sap.ui": {
      "technology": "UI5",
      "deviceTypes": {
        "desktop": true,
        "tablet": true,
        "phone": true
      }
    },
    "sap.ui5": {
      "rootView": {
        "viewName": "edusupport.platform.view.App",
        "type": "XML",
        "id": "app",
        "async": true
      },
      "dependencies": {
        "minUI5Version": "1.120.0",
        "libs": {
          "sap.ui.core": {},
          "sap.m": {},
          "sap.ui.layout": {},
          "sap.f": {}
        }
      },
      "models": {
        "i18n": {
          "type": "sap.ui.model.resource.ResourceModel",
          "settings": {
            "bundleName": "edusupport.platform.i18n.i18n"
          }
        }
      },
      "routing": {
        "config": {
          "routerClass": "sap.m.routing.Router",
          "viewType": "XML",
          "async": true,
          "viewPath": "edusupport.platform.view",
          "controlId": "app",
          "controlAggregation": "pages",
          "transition": "slide",
          "bypassed": {
            "target": "notFound"
          }
        },
        "routes": [
          {
            "pattern": "",
            "name": "home",
            "target": "home"
          },
          {
            "pattern": "Login",
            "name": "Login",
            "target": "Login"
          },
          {
            "pattern": "admin/Dashboard",
            "name": "Dashboard",
            "target": "Dashboard"
          },
          {
            "pattern": "launchpad",
            "name": "launchpad",
            "target": "launchpad"
          }
        ],
        "targets": {
          "home": {
            "viewName": "public.Home",
            "viewId": "home",
            "viewLevel": 1
          },
          "login": {
            "viewName": "public.Login",
            "viewLevel": 1
          },
          "dashboard": {
            "viewName": "public.Dashboard",
            "viewLevel": 2
          },
          "launchpad": {
            "viewName": "Launchpad",
            "viewLevel": 2
          },
          "notFound": {
            "viewName": "NotFound",
            "viewLevel": 1
          }
        }
      }
    }
  }
});
