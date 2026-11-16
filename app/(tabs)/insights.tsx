import { StyleSheet, Text, View } from 'react-native';

export default function InsightsScreen(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Insights</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F6F8F7',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#14201D',
  },
});
