import React from "react";
import { Graph } from "react-d3-graph";
import { RouteComponentProps, withRouter } from "react-router";
import { NetworkGraphData } from "../../../../utils/utils";

interface NetworkGraphProps {
  onClickNode(id: string): any;
  networkGraph: NetworkGraphData;
}
interface NetworkGraphState {
  data: any;
}

class NetworkGraph extends React.Component<
  NetworkGraphProps & RouteComponentProps,
  NetworkGraphState
> {
  public state = {
    data: { nodes: [], links: {} }
  };
  getNodesFromNodeDict = () => {
    const nodes = JSON.parse(JSON.stringify(this.props.networkGraph.nodes));
    return Object.keys(nodes).map((hostname: string) => {
      return { id: hostname };
    });
  };

  setInitialPositions = (nodes: any) => {
    return nodes.map((n: any) =>
      Object.assign({}, n, {
        x: n.x || Math.floor(Math.random() * 500),
        y: n.y || Math.floor(Math.random() * 500)
      })
    );
  };

  getInitialNodes = () => {
    return this.setInitialPositions(this.getNodesFromNodeDict());
  };
  componentDidMount() {
    if (this.props.networkGraph) {
      const data = {
        nodes: this.getInitialNodes(),

        links: this.props.networkGraph.links.slice()
      };
      this.setState({
        data
      });
    }
  }

  // the graph configuration, you only need to pass down properties
  // that you want to override, otherwise default ones will be used
  myConfig = {
    nodeHighlightBehavior: true,
    staticGraphWithDragAndDrop: true,
    node: {
      color: "lightgreen",
      fontColor: "white",
      size: 400,
      highlightStrokeColor: "blue"
    },

    link: {
      highlightColor: "lightblue"
    }
  };

  // graph event callbacks
  onClickGraph = function() {
    window.alert(`Clicked the graph background`);
  };

  // onClickNode = (nodeId: any) => {
  //   // window.alert(`Clicked node ${this.asset_id[nodeId]}`);
  //   this.props.history.push("/assets/" + this.asset_id[nodeId]);
  // };

  onDoubleClickNode = function(nodeId: any) {
    console.log(nodeId);
    window.alert(`Double clicked node ${nodeId}`);
  };

  onRightClickNode = function(event: any, nodeId: any) {
    console.log(nodeId);
    window.alert(`Right clicked node ${nodeId}`);
  };

  onMouseOverNode = function(nodeId: any) {
    window.alert(`Mouse over node ${nodeId}`);
  };

  onMouseOutNode = function(nodeId: any) {
    window.alert(`Mouse out node ${nodeId}`);
  };

  onClickLink = function(source: any, target: any) {
    window.alert(`Clicked link between ${source} and ${target}`);
  };

  onRightClickLink = function(event: any, source: any, target: any) {
    window.alert(`Right clicked link between ${source} and ${target}`);
  };

  onMouseOverLink = function(source: any, target: any) {
    window.alert(`Mouse over in link between ${source} and ${target}`);
  };

  onMouseOutLink = function(source: any, target: any) {
    window.alert(`Mouse out link between ${source} and ${target}`);
  };

  onNodePositionChange = function(nodeId: any, x: any, y: any) {
    window.alert(
      `Node ${nodeId} is moved to new position. New position is x= ${x} y= ${y}`
    );
  };

  render() {
    console.log(this.state.data, this.props);
    if (this.state.data.nodes.length === 0) {
      if (this.props.networkGraph) {
        const data = {
          nodes: this.getInitialNodes(),

          links: this.props.networkGraph.links.slice()
        };
        this.setState({
          data
        });
      }
    }

    return (
      <div className="graph-container">
        {this.state.data.nodes.length !== 0 ? (
          <Graph
            id="graph-id" // id is mandatory, if no id is defined rd3g will throw an error
            data={this.state.data}
            config={this.myConfig}
            onClickNode={(nodeID: any) => {
              this.props.onClickNode(this.props.networkGraph.nodes[nodeID]);
            }}
            onRightClickNode={this.onRightClickNode}
            onClickGraph={this.onClickGraph}
            onClickLink={this.onClickLink}
            onRightClickLink={this.onRightClickLink}
            // onMouseOverNode={this.onMouseOverNode}
            // onMouseOutNode={this.onMouseOutNode}
            // onMouseOverLink={this.onMouseOverLink}
            // onMouseOutLink={this.onMouseOutLink}
            onNodePositionChange={this.onNodePositionChange}
          />
        ) : null}
      </div>
    );
  }
}

export default withRouter(NetworkGraph);
