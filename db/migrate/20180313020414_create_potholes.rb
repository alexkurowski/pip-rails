class CreatePotholes < ActiveRecord::Migration[5.2]
  def change
    create_table :potholes do |t|
      t.integer  :category,  default: 0
      t.decimal  :latitude,  precision: 10, scale: 6, null: false
      t.decimal  :longitude, precision: 10, scale: 6, null: false
      t.datetime :fixed_at

      t.timestamps
    end

    add_index :potholes, [:latitude, :longitude]
    add_index :potholes, :fixed_at
  end
end
