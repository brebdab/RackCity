import { FormGroup } from "@blueprintjs/core";
import * as React from "react";
import Field from "./field";
import { RackRangeFields } from "../utils/utils";
interface RackRangeFormProps {
  handleChange(field: { [key: string]: any }): void;
  className?: string;
  values: RackRangeFields;
}
interface RackRangeFormState {
  values: RackRangeFields;
}

var console: any = {};
console.log = function () {};
class RackRangeForm extends React.Component<
  RackRangeFormProps,
  RackRangeFormState
> {
  public state = {
    values: {} as RackRangeFields,
  };
  componentDidMount = () => {
    this.setState({
      values: JSON.parse(JSON.stringify(this.props.values)),
    });
  };
  componentWillReceiveProps = (nextProps: RackRangeFormProps) => {
    if (
      JSON.stringify(nextProps.values) !== JSON.stringify(this.props.values)
    ) {
      this.setState({
        values: JSON.parse(JSON.stringify(nextProps.values)),
      });
    }
  };
  render() {
    return (
      <div className={this.props.className + " rack-range"}>
        <div className="rack-letter">
          <FormGroup
            className={this.props.className}
            inline={true}
            label="Row Letter Range   "
          >
            <Field
              field="letter_start"
              placeholder="start"
              type="text"
              value={this.state.values.letter_start}
              onChange={this.props.handleChange}
            />
          </FormGroup>
          <p className="dash">to</p>

          <FormGroup className={this.props.className}>
            <Field
              field="letter_end"
              type="text"
              placeholder="end"
              value={this.props.values.letter_end}
              onChange={this.props.handleChange}
            />
          </FormGroup>
        </div>
        <div className="rack-letter">
          <FormGroup
            className={this.props.className}
            inline={true}
            label="Rack Number Range"
          >
            <Field
              field="num_start"
              type="text"
              placeholder="start"
              value={this.props.values.num_start}
              onChange={this.props.handleChange}
            />
          </FormGroup>
          <p className="dash">to</p>

          <FormGroup className={this.props.className}>
            <Field
              field="num_end"
              type="text"
              placeholder="end"
              value={this.props.values.num_end}
              onChange={this.props.handleChange}
            />
          </FormGroup>
        </div>
      </div>
    );
  }
}
export default RackRangeForm;
