import React from 'react';

type LoadingStage = {
  id: string;
  label: string;
  completed: boolean;
};

interface LoadingSpinnerProps {
  isLoading: boolean;
  stages: LoadingStage[];
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  isLoading,
  stages,
  message = "正在加载..."
}) => {
  if (!isLoading) return null;

  const completedStages = stages.filter(stage => stage.completed).length;
  const totalStages = stages.length;
  const percentage = totalStages ? Math.round((completedStages / totalStages) * 100) : 0;

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-70">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full text-center">
        <div className="mb-4">
          <svg
            className="animate-spin h-12 w-12 text-primary mx-auto"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">{message}</h3>
        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
          <div 
            className="bg-primary h-2.5 rounded-full transition-all duration-300" 
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
        <div className="text-sm text-gray-600 mb-4">{percentage}% 完成</div>
        <ul className="space-y-2 text-left">
          {stages.map((stage) => (
            <li
              key={stage.id}
              className="flex items-center gap-2"
            >
              {stage.completed ? (
                <svg 
                  className="w-5 h-5 text-green-500" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="2" 
                    d="M5 13l4 4L19 7"
                  ></path>
                </svg>
              ) : (
                <svg 
                  className="w-5 h-5 text-gray-400 animate-pulse" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="2" 
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
              )}
              <span className={`${stage.completed ? 'text-green-500 font-medium' : 'text-gray-600'}`}>
                {stage.label}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}; 