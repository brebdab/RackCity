import { FormGroup } from "@blueprintjs/core";
import * as React from "react";
import Field from "../../forms/field";
interface RackRangeProps {
  handleChange(field: { [key: string]: any }): void;
  range: boolean;
  className?: string;
}
class RackRangeOptions extends React.Component<RackRangeProps> {
  render() {
    return (
      <div className={this.props.className}>
        <FormGroup className={this.props.className} label="Rack Letter ">
          <Field
            field="letter_start"
            type="text"
            onChange={this.props.handleChange}
          />
        </FormGroup>
        {this.props.range ? (
          <FormGroup className={this.props.className} label="Rack Letter (end)">
            <Field
              field="letter_end"
              type="text"
              onChange={this.props.handleChange}
            />
          </FormGroup>
        ) : null}
        <FormGroup className={this.props.className} label="Row number">
          <Field
            field="num_start"
            type="number"
            onChange={this.props.handleChange}
          />
        </FormGroup>

        {this.props.range ? (
          <FormGroup className={this.props.className} label="Row number (end)">
            <Field
              field="num_end"
              type="number"
              onChange={this.props.handleChange}
            />
          </FormGroup>
        ) : null}
      </div>
    );
  }
}
export default RackRangeOptions;
