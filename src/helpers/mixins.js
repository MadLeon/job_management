// Creates a transition config for a specific CSS property,
// depending on whether the drawer is expanded.
export function getDrawerSxTransitionMixin(isExpanded, property) {
  return {
    // `transition` can be a function that receives the MUI theme.
    transition: (theme) =>
      theme.transitions.create(property, {
        // Use the "sharp" easing provided by the MUI theme.
        easing: theme.transitions.easing.sharp,

        // Choose transition duration based on drawer state:
        // - enteringScreen: when the drawer is expanding
        // - leavingScreen: when the drawer is collapsing
        duration: isExpanded
          ? theme.transitions.duration.enteringScreen
          : theme.transitions.duration.leavingScreen,
      }),
  };
}


export function getDrawerWidthTransitionMixin(isExpanded) {
  return {
    ...getDrawerSxTransitionMixin(isExpanded, 'width'),
    overflowX: 'hidden',
  };
}