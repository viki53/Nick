# Nick

Un client IRC simple et ergonomique

## À Propos

L'objectif est d'avoir un client IRC léger et ergonomique (parce qu'IRC c'est pas que pour les barbus).

Cette application est basée sur [node-webkit](https://github.com/rogerwang/node-webkit), qui est donc nécessaire pour la faire fonctionner.

## Configurer l'application

La configuration de base se gère dans le fichier `js/config.json` et vous permet de spécifier les serveurs auxquels se connecter au lancement, ainsi que les channels à rejoindre.

Vous pouvez spécifier un nickname général (valable pour l'ensemble des serveurs), ainsi qu'un nickname pour chaque serveur (qui écrasera le nickname général).

## Lancer l'application

### Configuration nécessaire

* Mac OS X, Windows ou Linux
* Node Webkit

### Installer les dépendances

```
npm install
```

### Lancer l'application

#### Avec Sublime Text

Si vous utilisez Sublime Text, des Build Systems sont fournis pour OS X et Linux, vous n'avez qu'à adapter le chemin vers node-webkit.

#### Autres méthodes

Retrouvez les détails pour lancer le client de différentes façons sur [le Wiki de Noe-WebKit](https://github.com/rogerwang/node-webkit/wiki/How-to-run-apps).