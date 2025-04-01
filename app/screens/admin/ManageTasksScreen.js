import React, { useContext, useEffect } from 'react';
import { View, Text, Button, StyleSheet, FlatList } from 'react-native';
import { useTasks } from '../../hooks/useTasks';
import TaskCard from '../../components/tasks/TaskCard';

const ManageTasksScreen = ({ navigation }) => {
  const { tasks, refreshTasks } = useTasks();

  useEffect(() => {
    refreshTasks();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Manage Tasks</Text>
      <Button title="Create New Task" onPress={() => navigation.navigate('CreateTask')} />
      <FlatList
        data={tasks}
        renderItem={({ item }) => <TaskCard task={item} />}
        keyExtractor={(item) => item.id.toString()}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    marginBottom: 16,
  },
});

export default ManageTasksScreen;