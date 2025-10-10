export const mockTextbookContent = [
  {
    title: "What is Machine Learning?",
    content: [
      {
        type: "text",
        content: "Machine learning is a subset of artificial intelligence (AI) that enables computer systems to automatically learn and improve from experience without being explicitly programmed. Instead of following pre-programmed instructions, machine learning algorithms build mathematical models based on training data to make predictions or decisions."
      },
      {
        type: "text", 
        content: "The fundamental idea behind machine learning is to create systems that can adapt and improve their performance on a specific task through experience. This is achieved by exposing algorithms to large amounts of data and allowing them to identify patterns, relationships, and insights that would be difficult or impossible for humans to detect manually."
      },
      {
        type: "subsection",
        content: "Key Characteristics of Machine Learning"
      },
      {
        type: "text",
        content: "Machine learning systems share several key characteristics that distinguish them from traditional programming approaches. First, they learn from data rather than relying on explicit programming rules. Second, they can generalize from training examples to make predictions about new, unseen data. Third, they improve their performance over time as they are exposed to more data."
      },
      {
        type: "text",
        content: "Another crucial characteristic is the ability to handle complex, high-dimensional data that would be challenging for humans to process. Machine learning algorithms can find subtle patterns and relationships in data that might not be immediately apparent, making them valuable tools for solving complex real-world problems."
      }
    ]
  },
  {
    title: "Types of Machine Learning",
    content: [
      {
        type: "text",
        content: "Machine learning can be categorized into three main types based on the nature of the learning process and the type of feedback provided to the algorithm during training. Each type addresses different kinds of problems and requires different approaches to data preparation and model development."
      },
      {
        type: "subsection",
        content: "Supervised Learning"
      },
      {
        type: "text",
        content: "Supervised learning involves training algorithms on a labeled dataset, where both input features and corresponding correct outputs (targets) are provided. The algorithm learns to map inputs to outputs by finding patterns in the training data. Common examples include email spam detection, image classification, and price prediction."
      },
      {
        type: "code",
        content: `# Example: Simple Linear Regression
import numpy as np
from sklearn.linear_model import LinearRegression

# Training data
X = np.array([[1], [2], [3], [4], [5]])
y = np.array([2, 4, 6, 8, 10])

# Create and train model
model = LinearRegression()
model.fit(X, y)

# Make prediction
prediction = model.predict([[6]])
print(f"Prediction for input 6: {prediction[0]}")`
      },
      {
        type: "subsection",
        content: "Unsupervised Learning"
      },
      {
        type: "text",
        content: "Unsupervised learning works with data that has no labeled examples or target outputs. The algorithm must find hidden patterns, structures, or relationships in the data without any guidance about what the correct answer should be. Clustering, dimensionality reduction, and anomaly detection are common unsupervised learning tasks."
      },
      {
        type: "subsection",
        content: "Reinforcement Learning"
      },
      {
        type: "text",
        content: "Reinforcement learning involves an agent that learns to make decisions by interacting with an environment. The agent receives rewards or penalties based on its actions and learns to maximize cumulative reward over time. This approach is particularly useful for sequential decision-making problems like game playing, robotics, and autonomous systems."
      }
    ]
  },
  {
    title: "Applications and Impact",
    content: [
      {
        type: "text",
        content: "Machine learning has revolutionized numerous industries and aspects of daily life. From recommendation systems that suggest movies and products to medical diagnosis systems that can detect diseases from medical images, ML applications are becoming increasingly sophisticated and widespread."
      },
      {
        type: "text",
        content: "In the business world, machine learning powers fraud detection systems, algorithmic trading, customer segmentation, and predictive maintenance. Social media platforms use ML for content moderation, personalized feeds, and targeted advertising. Search engines rely on machine learning to understand user queries and rank results effectively."
      },
      {
        type: "text",
        content: "The healthcare industry has seen remarkable advances through machine learning applications. AI systems can now assist in diagnosing skin cancer, predict patient outcomes, discover new drugs, and personalize treatment plans. These applications have the potential to improve patient care while reducing costs and increasing accessibility to quality healthcare."
      }
    ]
  }
];

export const mockAIContent = {
  summary: "This section introduces machine learning as a subset of AI that enables systems to learn from data without explicit programming. It covers three main types: supervised learning (with labeled data), unsupervised learning (finding patterns in unlabeled data), and reinforcement learning (learning through interaction and rewards).",
  
  keyConcepts: [
    "Machine Learning Definition",
    "Learning from Data vs Programming",
    "Supervised Learning",
    "Unsupervised Learning", 
    "Reinforcement Learning",
    "Pattern Recognition",
    "Generalization",
    "Training vs Testing Data"
  ],

  applications: [
    {
      title: "E-commerce Recommendations",
      description: "ML algorithms analyze user behavior and purchase history to suggest relevant products, increasing sales and customer satisfaction."
    },
    {
      title: "Medical Diagnosis", 
      description: "Computer vision models can detect diseases in medical images with accuracy matching or exceeding human specialists."
    },
    {
      title: "Autonomous Vehicles",
      description: "Self-driving cars use reinforcement learning and computer vision to navigate safely and make real-time driving decisions."
    },
    {
      title: "Financial Fraud Detection",
      description: "Banks use supervised learning to identify unusual transaction patterns and prevent fraudulent activities in real-time."
    }
  ],

  practiceQuestions: [
    {
      id: 1,
      question: "What is the main difference between supervised and unsupervised learning?",
      difficulty: 2
    },
    {
      id: 2, 
      question: "Give an example of a real-world application for each type of machine learning.",
      difficulty: 3
    },
    {
      id: 3,
      question: "Why is the ability to generalize important in machine learning?",
      difficulty: 4
    },
    {
      id: 4,
      question: "How does reinforcement learning differ from the other two types?",
      difficulty: 3
    }
  ]
};