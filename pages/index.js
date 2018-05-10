import React, { Component, PureComponent } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  PanResponder,
  TouchableOpacity,
  Text,
} from 'react-native';
import { Svg, G, Path, Rect } from 'svgs';
import NoSSR from 'react-no-ssr';

import ZoomableSvg from 'zoomable-svg';
import { svgPath, bezierCommandCalc } from '../lib/smooth';

class SmoothPath extends PureComponent {
  render() {
    const { path } = this.props;
    return (
      <Path
        d={svgPath(path, bezierCommandCalc)}
        stroke="black"
        strokeWidth="1"
        fill="none"
      />
    );
  }
}

class Background extends PureComponent {
  render() {
    const { transform, paths } = this.props;
    return (
      <Svg width="100%" height="100%" style={styles.absfill}>
        <G transform={transform}>
          <Rect x="0" y="0" width="100" height="100" fill="white" />
          {paths.map((path, i) => <SmoothPath key={i} path={path} />)}
        </G>
      </Svg>
    );
  }
}

class Foreground extends PureComponent {
  render() {
    const { transform, currentPath } = this.props;
    return (
      <Svg width="100%" height="100%" style={styles.absfill}>
        <G transform={transform}>
          {currentPath ? <SmoothPath path={currentPath} /> : null}
        </G>
      </Svg>
    );
  }
}

class SvgRoot extends PureComponent {
  constructor() {
    super();
    const noop = () => {};
    const yes = () => true;
    const shouldRespond = () => {
      return this.props.drawing;
    };
    this._panResponder = PanResponder.create({
      onPanResponderGrant: noop,
      onPanResponderTerminate: noop,
      onShouldBlockNativeResponder: yes,
      onMoveShouldSetPanResponder: shouldRespond,
      onStartShouldSetPanResponder: shouldRespond,
      onPanResponderTerminationRequest: shouldRespond,
      onMoveShouldSetPanResponderCapture: shouldRespond,
      onStartShouldSetPanResponderCapture: shouldRespond,
      onPanResponderMove: ({ nativeEvent }) => {
        const { touches } = nativeEvent;
        const { length } = touches;
        if (length === 1) {
          const [{ pageX, pageY }] = touches;
          this.processTouch(pageX, pageY);
        }
      },
      onPanResponderRelease: () => {
        this.setState(({ paths, currentPath }) => ({
          paths: [...paths, currentPath],
          currentPath: null,
        }));
      },
    });
  }

  state = {
    paths: [],
    currentPath: null,
  };

  processTouch = (sx, sy) => {
    const { transform } = this.props;
    const { currentPath } = this.state;
    const { translateX, translateY, scaleX, scaleY } = transform;
    const x = (sx - translateX) / scaleX;
    const y = (sy - translateY) / scaleY;
    if (!currentPath) {
      this.setState({ currentPath: [[x, y]] });
    } else {
      this.setState({ currentPath: [...currentPath, [x, y]] });
    }
  };

  render() {
    const { paths, currentPath } = this.state;
    const {
      transform: { scaleX, scaleY, translateX, translateY },
    } = this.props;
    const transform = `translate(${translateX},${translateY})scale(${scaleX},${scaleY})`;
    return (
      <View {...this._panResponder.panHandlers} style={styles.absfill}>
        <Background transform={transform} paths={paths} />
        <Foreground transform={transform} currentPath={currentPath} />
      </View>
    );
  }
}

const { width, height } = Dimensions.get('window');

export default class App extends PureComponent {
  constructor(props) {
    super(props);
    this.zoomable = React.createRef();
  }

  state = {
    drawing: false,
    height,
    width,
  };

  toggleDrawing = () => {
    this.setState(({ drawing }) => ({
      drawing: !drawing,
    }));
  };

  reset = () => {
    this.zoomable.current.reset();
  };

  updateDimensions = () => {
    const { width, height } = Dimensions.get('window');
    this.setState({ width, height });
  };

  componentDidMount() {
    this.updateDimensions();
    Dimensions.addEventListener('change', this.updateDimensions);
  }

  componentWillUnmount() {
    Dimensions.removeEventListener('change', this.updateDimensions);
  }

  render() {
    const { drawing, width, height } = this.state;
    return (
      <View style={[styles.container, styles.absfill]}>
        <NoSSR>
          <ZoomableSvg
            ref={this.zoomable}
            style={styles.zoomable}
            align="mid"
            vbWidth={100}
            vbHeight={100}
            width={width}
            height={height}
            initialTop={0}
            initialLeft={0}
            initialZoom={1}
            doubleTapThreshold={300}
            meetOrSlice="meet"
            svgRoot={SvgRoot}
            lock={drawing}
            childProps={this.state}
          />
        </NoSSR>
        <View style={styles.buttons}>
          <TouchableOpacity onPress={this.reset}>
            <Text>Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={this.toggleDrawing}>
            <Text>{drawing ? 'Move' : 'Draw'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
}

const styles = {
  container: {
    backgroundColor: '#ecf0f1',
  },
  absfill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  zoomable: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  buttons: {
    position: 'absolute',
    bottom: 10,
    right: 10,
  },
};
