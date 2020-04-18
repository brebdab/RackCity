import React from "react";
import Graph from "react-graph-vis";
import { RouteComponentProps, withRouter } from "react-router";
import { NetworkGraphData, Node } from "../../../../utils/utils";

interface NetworkGraphProps {
  onClickNode(id: string): any;
  networkGraph: NetworkGraphData;
  isDecommissioned: boolean;
}

class NetworkGraph extends React.Component<
  NetworkGraphProps & RouteComponentProps
> {
  options = {
    layout: {},
    edges: {
      color: "#5C7080",
      arrows: {
        to: false,
        from: false,
      },
    },
    nodes: {
      color: {
        background: "#202B33",
        border: "#202B33",
        highlight: {
          background: "#182026",
          border: "#30404D",
        },
      },
      font: { color: "white" },
      physics: false,
    },
    interaction: {
      hover: !this.props.isDecommissioned,
      zoomView: false,
    },
  };

  onClickNode = (event: any) => {
    var { nodes } = event;
    if (nodes.length > 0 && !this.props.isDecommissioned) {
      this.props.onClickNode(nodes[0]);
    }
  };
  events = {
    select: this.onClickNode,
  };

  getRouteID(id: number) {
    this.props.networkGraph.nodes
      .map((node: Node) => {
        return node.route_id;
      })
      .filter((route_id: number) => route_id === id);
  }
  render() {
    return (
      <div className="graph-container">
        {this.props.networkGraph ? (
          <Graph
            graph={this.props.networkGraph}
            options={this.options}
            events={this.events}
          />
        ) : null}
      </div>
    );
  }
}

export default withRouter(NetworkGraph);
