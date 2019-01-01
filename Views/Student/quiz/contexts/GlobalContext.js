/**
 * Lightweight "redux" implementation.
 * This app doesn't really require Redux, but a global state manager would help.
 */

import React, {Component} from 'react';

export const GlobalContext = React.createContext({});

/**
 * Returns a component with GlobalContext.Provider
 * @param WrappedComponent
 * @returns {React.Component}
 */
export function withGlobalContextProvider(WrappedComponent) {
    return class extends Component {

        constructor(props) {
            super(props);
            this.state = {
                data: {
                    // Default state values
                    route: "connect",
                    connected: false,
                    connectionFailure: false,
                    quiz: null,
                    selectedQuestion: 0
                }
            };
        }

        reduce = (newState) => {
            this.setState({
                data: {
                    ...this.state.data,
                    ...newState
                }
            });
        };

        getData = () => {
            return this.state.data;
        };

        render() {
            return (
                <GlobalContext.Provider value={{
                    data: this.state.data,
                    reduce: this.reduce,
                    getData: this.getData
                }}>
                    <WrappedComponent {...this.props} />
                </GlobalContext.Provider>
            )
        }
    }
}

/**
 * Returns a component with globalContext as prop
 * @param WrappedComponent
 * @returns {React.Component}
 */
export function withGlobalContext(WrappedComponent) {

    return class extends Component {

        constructor(props) {
            super(props);
        }

        render() {
            return (
                <GlobalContext.Consumer>
                    {value => {
                        return <WrappedComponent globalContext={value} {...this.props} />
                    }}
                </GlobalContext.Consumer>
            )
        }
    }
}