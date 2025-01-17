require('../info/packageInfo');

module.exports = require('an').directive(graphViewer);

function graphViewer() {
  return {
    restrict: 'E',
    template: '<div class="graphView d2d"></div>',
    replace: true,
    transclude: true,
    scope: {
      'source': '=',
      'nodeSelected': '=',
      'root': '=',
      'mode': '='
    },

    compile: function() {
      return link;

      function link(scope, element) {
        var graph = scope.source;
        var renderer = createRenderer();

        scope.$on('$destroy', renderer.dispose);

        function createRenderer() {
          var settings = {
            physics: require('../physics')(),
            container: element[0],
            scrollSpeed: 0.02
          };
          var renderer = require('ngraph.svg')(graph, settings);

          scope.$on('highlight-node', function(_, request) {
            highlightNodesFromRequest(request);
          });

          scope.$on('highlight-compatibility', function(_, request) {
            highlightCompatibilityFromRequest(request);
          });

          scope.$on('highlight-link-compatibility', function(_, request) {
            highlightLinkCompatibilityFromRequest(request);
          });

          var graphUI = require('./graphUI')(renderer.svgRoot);

          renderer.node(graphUI.node).placeNode(graphUI.placeNode);
          renderer.link(graphUI.link).placeLink(graphUI.placeLink);

          graphUI.on('nodeselected', onNodeSelected);
          graphUI.on('mouseenter', higlightNode);

          renderer.run();

          var rootNode = graph.getNode(scope.root);
          if (rootNode) {
            renderer.layout.pinNode(rootNode, true);
            higlightNode(rootNode);
          } else {
            graph.on('changed', pinRootNode);
          }

          return renderer;

          function pinRootNode(changes) {
            for (var i = 0; i < changes.length; ++i) {
              var change = changes[i];
              var isRootAdded = change.changeType === 'add' && change.node;
              if (isRootAdded) {
                graph.root = change.node;
                renderer.layout.pinNode(change.node, true);
                higlightNode(change.node);
                graph.off('changed', pinRootNode);
              }
            }
          }

          function higlightNode(node) {
            resetHighlight();

            // reset all links except the links that are marked as incompatible
            graph.forEachLink(function(link) {
              if(link.data === undefined || !(link.data.compatible == false)) graphUI.defaultLinkHighlight(link);
            });

            graphUI.highlight(node.id, '#E0DE0F', '#E0DE0F');

            graph.forEachLinkedNode(node.id, function(other, link) {
              var color = '#CFCCDF';
              graphUI.highlight(other.id, color);

              // Highlight links of the node, except if the link is marked as incompatible
              if(link.data === undefined || !(link.data.compatible == false)) graphUI.highlightLink(link.id, color);

            });
          }

          function resetHighlight() {
            graph.forEachNode(graphUI.resetHighlight);
          }

          function onNodeSelected(node) {
            scope.$root.$broadcast('node-selected', node);
          }

          function highlightNodesFromRequest(request) {
            graph.forEachNode(graphUI.defaultHighlight);
            request.ids.forEach(function (id) { graphUI.setColor(id, request.color); });
          }

          function highlightCompatibilityFromRequest(request) {
            graph.forEachNode(graphUI.defaultHighlight);
            request.incompids.forEach(function (id) { graphUI.setColor(id, 'red'); });
          }

          function highlightLinkCompatibilityFromRequest(request) {
            graphUI.resetLinks();
            request.incomplinks.forEach(function (link) { graphUI.highlightLink(link.id, 'red'); });
          }
          
        }
      }
    }
  };
}
