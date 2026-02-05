import React, { useEffect, useState } from 'react';

// Enhanced naming conventions for interfaces
interface TodoItem {
  todoId: number;
  todoText: string;
  createdAtTimestamp: Date;
}

interface DashboardStatistics {
  currentCounterValue: number;
  totalTodoItemCount: number;
  milestoneAchieved: boolean;
}

// Enhanced component name following our naming conventions
export default function InteractiveDashboard() {
  const [counterValue, setCounterValue] = useState(0);
  const [milestoneMessage, setMilestoneMessage] = useState('');
  const [todoList, setTodoList] = useState<TodoItem[]>([]);
  const [newTodoInput, setNewTodoInput] = useState('');
  const [nextTodoId, setNextTodoId] = useState(1);

  // Enhanced statistics object with improved naming
  const dashboardStatistics: DashboardStatistics = {
    currentCounterValue: counterValue,
    totalTodoItemCount: todoList.length,
    milestoneAchieved: counterValue === 10 || counterValue === 20
  };

  // Enhanced effect hook with better naming
  useEffect(() => {
    if (counterValue === 10) {
      setMilestoneMessage('🎉 You reached 10! Great progress!');
    } else if (counterValue === 20) {
      setMilestoneMessage('🚀 Amazing! You reached 20! Incredible achievement!');
    } else if (counterValue === 50) {
      setMilestoneMessage('💫 Legendary! You reached 50! Unbelievable!');
    } else {
      setMilestoneMessage('');
    }
  }, [counterValue]);

  // Enhanced method names for better descriptiveness
  const incrementCounterValue = () => {
    setCounterValue(counterValue + 1);
  };

  const decrementCounterValue = () => {
    setCounterValue(counterValue - 1);
  };

  const resetCounterValue = () => {
    setCounterValue(0);
  };

  const addTodoItem = () => {
    if (newTodoInput.trim()) {
      const newTodo: TodoItem = {
        todoId: nextTodoId,
        todoText: newTodoInput.trim(),
        createdAtTimestamp: new Date()
      };
      setTodoList([...todoList, newTodo]);
      setNewTodoInput('');
      setNextTodoId(nextTodoId + 1);
    }
  };

  const removeTodoItem = (todoId: number) => {
    setTodoList(todoList.filter(todo => todo.todoId !== todoId));
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setNewTodoInput(event.target.value);
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      addTodoItem();
    }
  };

  // Enhanced method names for styling utilities
  const getCounterColorClass = () => {
    if (counterValue >= 50) return 'text-purple-600';
    if (counterValue >= 20) return 'text-indigo-600';
    if (counterValue >= 10) return 'text-blue-600';
    return 'text-gray-800';
  };

  const getMilestoneColorClass = () => {
    if (counterValue >= 50) return 'text-purple-600';
    if (counterValue >= 20) return 'text-indigo-600';
    return 'text-green-600';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
        {/* Header Section */}
        <header className="text-center space-y-4">
          <h1 className="text-3xl md:text-5xl font-bold text-blue-600 mb-2">
            Interactive Dashboard
          </h1>
          <p className="text-gray-600 text-lg">
            A comprehensive React component showcasing state management and modern UI design
          </p>
        </header>

        {/* Counter Section */}
        <section className="bg-white rounded-xl shadow-lg p-6 md:p-8">
          <h2 className="text-2xl md:text-3xl font-semibold text-gray-800 mb-6">Interactive Counter</h2>
          <div className="flex flex-col items-center space-y-4">
            <div className="flex items-center justify-center space-x-4">
              <button
                onClick={decrementCounter}
                className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all duration-200 transform hover:scale-105"
                aria-label="Decrement counter"
              >
                <span className="text-xl font-bold">−</span>
              </button>
              <div className="text-center">
                <span className={`text-4xl md:text-5xl font-bold ${getCounterColorClass()}`}>
                  {counterValue}
                </span>
                {milestoneMessage && (
                  <p className={`mt-2 font-semibold ${getMilestoneColorClass()}`}>
                    {milestoneMessage}
                  </p>
                )}
              </div>
              <button
                onClick={incrementCounter}
                className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all duration-200 transform hover:scale-105"
                aria-label="Increment counter"
              >
                <span className="text-xl font-bold">+</span>
              </button>
            </div>
            <button
              onClick={resetCounter}
              className="px-8 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all duration-200 transform hover:scale-105"
            >
              Reset Counter
            </button>
          </div>
        </section>

        {/* Todo List Section */}
        <section className="bg-white rounded-xl shadow-lg p-6 md:p-8">
          <h2 className="text-2xl md:text-3xl font-semibold text-gray-800 mb-6">Task Management</h2>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 mb-6">
            <input
              type="text"
              value={newTodoInput}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="Enter a new task..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="New task input"
            />
            <button
              onClick={addTodoItem}
              className="px-8 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-200 transform hover:scale-105 font-semibold"
            >
              Add Task
            </button>
          </div>
          {todoList.length > 0 && (
            <ul className="space-y-3">
              {todoList.map((todo) => (
                <li key={todo.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                  <div className="flex-1">
                    <span className="text-gray-800 font-medium">{todo.text}</span>
                    <p className="text-xs text-gray-500 mt-1">
                      Added: {todo.createdAt.toLocaleTimeString()}
                    </p>
                  </div>
                  <button
                    onClick={() => removeTodoItem(todo.id)}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all duration-200 transform hover:scale-105 text-sm font-medium"
                    aria-label={`Remove task: ${todo.text}`}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          {todoList.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500 text-lg">No tasks yet. Add your first task above!</p>
            </div>
          )}
        </section>

        {/* Statistics Dashboard */}
        <section className="bg-white rounded-xl shadow-lg p-6 md:p-8">
          <h2 className="text-2xl md:text-3xl font-semibold text-gray-800 mb-6">Live Statistics</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
            <div className="text-center p-6 bg-blue-50 rounded-lg border border-blue-200">
              <p className={`text-3xl md:text-4xl font-bold ${getCounterColorClass()}`}>
                {statistics.currentCountValue}
              </p>
              <p className="text-gray-600 mt-2 font-medium">Current Counter</p>
            </div>
            <div className="text-center p-6 bg-green-50 rounded-lg border border-green-200">
              <p className="text-3xl md:text-4xl font-bold text-green-600">
                {statistics.totalTodosCount}
              </p>
              <p className="text-gray-600 mt-2 font-medium">Total Tasks</p>
            </div>
            <div className="text-center p-6 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-3xl md:text-4xl font-bold text-purple-600">
                {statistics.isMilestoneReached ? '✓' : '○'}
              </p>
              <p className="text-gray-600 mt-2 font-medium">Milestone</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
