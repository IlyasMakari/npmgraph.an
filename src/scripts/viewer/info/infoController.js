var toGravatar = require('./toGravatar');
var getPackageVersions = require('../../getPackageVersions.js');
var getLocation = require('../getLocation.js');
var isCompatible = require('./matrix.js');

module.exports = infoController;

function infoController($scope, $http, $q, $location, $routeParams) {
  var applyToScope = require('../applyToScope')($scope);
  var selectedLicense;

  $scope.highlightNodes = function(record, e) {
    e.preventDefault();

    $scope.$root.$broadcast('highlight-node', {
      color: '#52CCE3',
      ids: record.packages
    });

    if (selectedLicense) selectedLicense.selected = false;
    selectedLicense = record;
    if (selectedLicense) selectedLicense.selected = true;

    $scope.responsiveOpen = false;
    if (e && document.body.client.width < 630) {
      // On small screens this scrolls package Info/graph info into view.
      // TODO: Get rid of this code.
      var container = document.querySelector('.infoBox');
      if (container) container.scrollTop = 0;
    }
  };

  $scope.compatibilityTester = function(e) {
    e.preventDefault();

    let graph = $scope.graph

    // Find all packages that are incompatible with license of the root package (highlight nodes)
    let compatiblePackages = [];
    let incompatiblePackages = [];
    let licenses = $scope.allLicenses
    let rootLicense = graph.root.data.license
    licenses.forEach(function(lic) {
      if(isCompatible(lic.name, rootLicense) == true) {
        compatiblePackages = compatiblePackages.concat(lic.packages);
        lic.compatible = true;
      }
      if(isCompatible(lic.name, rootLicense) == false) {
        incompatiblePackages = incompatiblePackages.concat(lic.packages);
        lic.compatible = false;
      }
    });

    $scope.$root.$broadcast('highlight-compatibility', {
      compids: compatiblePackages,
      incompids: incompatiblePackages
    });

    // Find all incompatible dependencies (highlight edges)
    let compatibleLinks = [];
    let incompatibleLinks = [];
    graph.forEachLink(function(link) {
      if(link.data === undefined) link.data = {};
      let from = graph.getNode(link.fromId);
      let to = graph.getNode(link.toId);
      if(isCompatible(to.data.license, from.data.license) == true) {
        link.data.compatible = true;
        compatibleLinks.push(link);
      }
      if(isCompatible(to.data.license, from.data.license) == false) {
        link.data.compatible = false;
        incompatibleLinks.push(link);
      }
    });

    $scope.$root.$broadcast('highlight-link-compatibility', {
      complinks: compatibleLinks,
      incomplinks: incompatibleLinks
    });

    // if (selectedLicense) selectedLicense.selected = false;
    // selectedLicense = record;
    // if (selectedLicense) selectedLicense.selected = true;

    // $scope.responsiveOpen = false;
    // if (e && document.body.client.width < 630) {
    //   // On small screens this scrolls package Info/graph info into view.
    //   // TODO: Get rid of this code.
    //   var container = document.querySelector('.infoBox');
    //   if (container) container.scrollTop = 0;
    // }
  };

  $scope.hideInfoBox = function (e) {
    $scope.responsiveOpen = false;
    e.preventDefault();
  };

  $scope.graphLoaded = false;
  $scope.packageInfoVisible = true;

  $scope.renderUpdatedVersion = renderUpdatedVersion;
  $scope.switchInfoMode = switchInfoMode;
  $scope.$on('node-selected', applyToScope(onSelectNode));
  $scope.$on('graph-loaded', graphLoaded);

  function onSelectNode(e, node) {
    selectNode(node);
    switchInfoMode('package');
  }

  function renderUpdatedVersion() {
    var path = getLocation(
      $routeParams, /* is2d = */ true,
      $scope.selectedVersion,
      $scope.selectedPackage.name
    )

    $location.path(path);
  }

  function updateVersions(name) {
    getPackageVersions($http, $q, name).then(function(versions) {
      if (name !== getSelectedPackageName()) {
        return;
      }

      $scope.versions = versions;
      $scope.selectedVersion = $scope.selectedPackage.version;
    });
  }

  function getSelectedPackageName() {
    return $scope.selectedPackage && $scope.selectedPackage.name;
  }

  function switchInfoMode(mode, e) {
    if (e) e.preventDefault();
    $scope.packageInfoVisible = mode === 'package';
    $scope.graphInfoVisible = mode === 'graph';
    // only open in responsive mode when use explicitly clicked on a link:
    $scope.responsiveOpen = !!e;
  }

  function selectNode(node) {
    var data = node.data;
    if (data && !('name' in data)) {
      data = {
        id: node.id,
        remote: true
      };
    }

    $scope.selectedPackage = data;

    if (data.maintainers && data.maintainers.length) {
      $scope.maintainers = data.maintainers.map(toGravatar);
    }

    if (!data.remote) {
      updateVersions(getSelectedPackageName());
    }
  }

  function graphLoaded() {
    var graph = $scope.graph;
    $scope.linksCount = graph.getLinksCount();
    $scope.nodesCount = graph.getNodesCount();

    $scope.graphLoaded = true;
    $scope.allMaintainers = require('./maintainers')(graph);
    $scope.allLicenses = require('./licenses')(graph);
    $scope.allNames = require('./names')(graph);

    selectNode(graph.root);
    switchInfoMode('graph');
  }
}

infoController.$inject = ['$scope', '$http', '$q', '$location', '$routeParams'];
