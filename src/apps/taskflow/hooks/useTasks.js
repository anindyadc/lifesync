import { useState, useEffect } from 'react';
import { 
  collection, addDoc, updateDoc, deleteDoc, doc, 
  onSnapshot, serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';

const APP_ID = 'default-app-id';

export const useTasks = (user) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const q = collection(db, 'artifacts', APP_ID, 'users', user.uid, 'tasks');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => { 
        const taskData = doc.data(); 
        // Ensure arrays and numbers exist to prevent crashes
        return { 
          id: doc.id, 
          ...taskData, 
          subtasks: taskData.subtasks || [], 
          timeSpent: taskData.timeSpent || 0 
        }; 
      });
      // Sort by newest first
      data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setTasks(data);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [user]);

  const addTask = async (taskData) => {
    await addDoc(collection(db, 'artifacts', APP_ID, 'users', user.uid, 'tasks'), { 
      ...taskData, 
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp() 
    });
  };

  const updateTask = async (id, taskData) => {
    await updateDoc(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'tasks', id), {
      ...taskData,
      updatedAt: serverTimestamp()
    });
  };

  const deleteTask = async (id) => {
    await deleteDoc(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'tasks', id));
  };

  return { tasks, loading, addTask, updateTask, deleteTask };
};