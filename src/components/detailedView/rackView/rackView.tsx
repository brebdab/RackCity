// import { Classes } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
//import "./bootstrap.min.css";
// import axios from "axios";

import * as React from "react";
import { RouteComponentProps, withRouter } from "react-router";
import { Container, Row, Col } from "react-bootstrap";

// pass in rack info as props

export interface RackViewProps {
  instances: any;
}

export class RackView extends React.PureComponent<
  RouteComponentProps,
  RackViewProps
> {
  public render() {
    return (
      <Container>
        <Row className="show-grid">
          <Col>1 of 2</Col>
          <Col>2 of 2</Col>
        </Row>
      </Container>
    );
  }
}

interface State {
  columns: Array<string>;
  data: any;
}

export class RackTable extends React.Component {
  public render() {
    return <p>hello</p>;
  }
}

export default withRouter(RackView);
