import React, { useState } from 'react';

// Define the shape of the form data
interface CharacterFormData {
  name: string;
  gender: '男' | '女' | '其他';
  age: number;
  description: string;
}

// Define the props for the component
interface CharacterCreationFormProps {
  onSubmit: (data: CharacterFormData) => void;
}

const CharacterCreationForm: React.FC<CharacterCreationFormProps> = ({ onSubmit }) => {
  const [formData, setFormData] = useState<CharacterFormData>({
    name: '',
    gender: '男',
    age: 18,
    description: '',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'age' ? parseInt(value, 10) : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-gray-800 text-white rounded-lg">
      <div>
        <label htmlFor="name" className="block text-sm font-medium">名称</label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
        />
      </div>
      <div>
        <label htmlFor="gender" className="block text-sm font-medium">性别</label>
        <select
          id="gender"
          name="gender"
          value={formData.gender}
          onChange={handleChange}
          className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
        >
          <option>男</option>
          <option>女</option>
          <option>其他</option>
        </select>
      </div>
      <div>
        <label htmlFor="age" className="block text-sm font-medium">年龄</label>
        <input
          type="number"
          id="age"
          name="age"
          value={formData.age}
          onChange={handleChange}
          required
          className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
        />
      </div>
      <div>
        <label htmlFor="description" className="block text-sm font-medium">描述</label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={4}
          required
          className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
        />
      </div>
      <button
        type="submit"
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        开始冒险
      </button>
    </form>
  );
};

export default CharacterCreationForm;